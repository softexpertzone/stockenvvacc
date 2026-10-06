import prisma from '../lib/prisma.js';
import { allocationQueue } from '../config/queue.js';

// --- SUGGEST TRANSFER PLAN (Required for the frontend plan generator) ---
export const suggestTransferPlan = async (req, res) => {
    // Prevent 304 Not Modified browser caching issues
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Robust fallbacks to match frontend payload variations
    const productVariantId = req.query.productVariantId || req.query.variantId;
    const requestedQty = parseInt(req.query.requestedQty || req.query.quantity || req.query.qty || 1, 10);
    const sourceGodownId = req.query.sourceGodownId || req.query.godownId;

    try {
        if (!productVariantId || !sourceGodownId) {
            return res.status(400).json({
                success: false,
                message: "productVariantId and sourceGodownId are required."
            });
        }

        // Find available inventory balances in bins within the specified source godown
        const balances = await prisma.inventoryBalance.findMany({
            where: {
                productVariantId: productVariantId,
                bin: {
                    godownId: sourceGodownId
                }
            },
            include: {
                bin: true,
                batch: true
            }
        });

        let remainingQty = requestedQty;
        const allocationPlan = [];

        for (const balance of balances) {
            if (remainingQty <= 0) break;

            const availableInBin = balance.currentCount - balance.allocatedCount;
            if (availableInBin > 0) {
                const qtyToPick = Math.min(availableInBin, remainingQty);

                allocationPlan.push({
                    productVariantId: balance.productVariantId,
                    batchId: balance.batchId,
                    batchNumber: balance.batch?.batchNumber || 'DEFAULT',
                    qtyToPick: qtyToPick,
                    sourceBinId: balance.binId
                });

                remainingQty -= qtyToPick;
            }
        }

        if (remainingQty > 0) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock in godown. Requested: ${requestedQty}, Short by: ${remainingQty}`
            });
        }

        res.status(200).json({ success: true, allocationPlan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// --- PHASE 1: PLAN (Locking Stock) ---
export const createPlannedTransfer = async (req, res) => {
    const { items, notes, userId } = req.body;

    try {
        const transfer = await prisma.$transaction(async (tx) => {
            // 1. Create the Transfer Header
            const header = await tx.internalTransfer.create({
                data: {
                    transferRef: `TRN-${Date.now()}`,
                    processedBy: userId,
                    notes: notes,
                }
            });

            // 2. Process Items and Lock Stock
            for (const item of items) {
                // Fetch current balance using specific composite key
                const balance = await tx.inventoryBalance.findUnique({
                    where: {
                        productVariantId_binId_batchId: {
                            productVariantId: item.variantId,
                            binId: item.sourceBinId,
                            batchId: item.batchId
                        }
                    }
                });

                if (!balance) throw new Error(`Balance record not found for variant ${item.variantId}`);

                // Mathematical lock: (Current - Allocated) >= Request
                const available = balance.currentCount - balance.allocatedCount;
                if (available < item.qty) throw new Error(`Insufficient stock for variant ${item.variantId}`);

                // Update allocatedCount
                await tx.inventoryBalance.update({
                    where: { id: balance.id },
                    data: { allocatedCount: { increment: item.qty } }
                });

                // Create item link
                await tx.internalTransferItem.create({
                    data: {
                        internalTransferId: header.id,
                        productVariantId: item.variantId,
                        sourceBinId: item.sourceBinId,
                        destinationBinId: item.destinationBinId,
                        quantityCount: item.qty
                    }
                });
            }
            return header;
        });

        // 3. Schedule 24h cleanup in Redis
        await allocationQueue.add('cleanup', { transferId: transfer.id }, { delay: 86400000 });

        res.status(200).json({ success: true, transfer });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// --- PHASE 2: EXECUTE (Moving Stock) ---
export const executePlannedTransfer = async (req, res) => {
    const { transferId } = req.body;

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Fetch Transfer
            const transfer = await tx.internalTransfer.findUnique({
                where: { id: transferId },
                include: { items: true }
            });

            if (!transfer) throw new Error("Transfer record not found.");

            for (const item of transfer.items) {
                // 2. Source: Deduct and Release
                await tx.inventoryBalance.update({
                    where: {
                        productVariantId_binId_batchId: {
                            productVariantId: item.productVariantId,
                            binId: item.sourceBinId,
                            batchId: item.batchId
                        }
                    },
                    data: {
                        currentCount: { decrement: item.quantityCount },
                        allocatedCount: { decrement: item.quantityCount }
                    }
                });

                // 3. Destination: Upsert (Crucial: Handles new bin locations)
                await tx.inventoryBalance.upsert({
                    where: {
                        productVariantId_binId_batchId: {
                            productVariantId: item.productVariantId,
                            binId: item.destinationBinId,
                            batchId: item.batchId
                        }
                    },
                    create: {
                        productVariantId: item.productVariantId,
                        binId: item.destinationBinId,
                        batchId: item.batchId,
                        currentCount: item.quantityCount
                    },
                    update: {
                        currentCount: { increment: item.quantityCount }
                    }
                });

                // 4. Create Audit Ledger Entries
                await tx.stockLedger.createMany({
                    data: [
                        { productVariantId: item.productVariantId, sourceBinId: item.sourceBinId, quantityCount: -item.quantityCount, type: 'INTERNAL_TRANSFER', reference: transferId },
                        { productVariantId: item.productVariantId, destinationBinId: item.destinationBinId, quantityCount: item.quantityCount, type: 'INTERNAL_TRANSFER', reference: transferId }
                    ]
                });
            }
        });
        res.status(200).json({ success: true, message: "Transfer Executed Successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};