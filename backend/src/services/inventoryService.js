import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

/**
 * Helper to calculate remaining capacity of a specific bin
 */
async function checkBinCapacity(tx, binId, incomingVariantId, incomingQty) {
    const bin = await tx.bin.findUnique({
        where: { id: binId },
        include: {
            inventoryBalances: {
                include: { productVariant: true }
            }
        }
    });

    if (!bin) throw new Error("Target Bin does not exist.");

    const variant = await tx.productVariant.findUnique({
        where: { id: incomingVariantId }
    });
    if (!variant) throw new Error("Product variant not found.");

    // Calculate current metrics inside the bin
    let currentWeight = 0;
    let currentVolume = 0;

    bin.inventoryBalances.forEach(balance => {
        const weight = Number(balance.productVariant.weightKg || 0);
        const volume = Number(balance.productVariant.volumeCm3 || 0);
        currentWeight += balance.currentCount * weight;
        currentVolume += balance.currentCount * volume;
    });

    // Calculate incoming load metrics
    const incomingWeight = incomingQty * Number(variant.weightKg || 0);
    const incomingVolume = incomingQty * Number(variant.volumeCm3 || 0);

    const targetWeight = currentWeight + incomingWeight;
    const targetVolume = currentVolume + incomingVolume;

    // Validate against constraints if limits are set (> 0)
    if (Number(bin.maxWeightKg) > 0 && targetWeight > Number(bin.maxWeightKg)) {
        throw new Error(`Capacity Exceeded: Bin ${bin.name} cannot support an additional ${incomingWeight.toFixed(2)}kg (Max: ${bin.maxWeightKg}kg, Current: ${currentWeight.toFixed(2)}kg).`);
    }
    if (Number(bin.maxVolumeCm3) > 0 && targetVolume > Number(bin.maxVolumeCm3)) {
        throw new Error(`Capacity Exceeded: Bin ${bin.name} cannot support an additional ${incomingVolume.toFixed(2)}cm³ (Max: ${bin.maxVolumeCm3}cm³, Current: ${currentVolume.toFixed(2)}cm³).`);
    }

    return true;
}

// ==========================================
// 1. READ / ADJUSTMENTS
// ==========================================

const getAllInventory = async () => {
    return await prisma.inventoryBalance.findMany({
        where: { isActive: true },
        include: {
            productVariant: {
                select: {
                    sku: true,
                    price: true,
                    product: { select: { name: true } }
                }
            },
            bin: {
                include: {
                    shelf: {
                        include: {
                            rack: {
                                include: {
                                    aisle: {
                                        include: {
                                            room: {
                                                include: {
                                                    zone: {
                                                        include: { godown: true }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            batch: true
        }
    });
};

const updateStock = async (variantId, binId, batchId, quantity, type) => {
    return await prisma.$transaction(async (tx) => {
        const qty = Number(quantity);

        if (!binId || !batchId) throw new Error("Bin ID and Batch ID are strictly required.");

        if (type === 'ADD') {
            await checkBinCapacity(tx, binId, variantId, qty);

            const balance = await tx.inventoryBalance.upsert({
                where: {
                    productVariantId_binId_batchId: { productVariantId: variantId, binId: binId, batchId: batchId }
                },
                update: { currentCount: { increment: qty } },
                create: { productVariantId: variantId, binId: binId, batchId: batchId, currentCount: qty }
            });

            await tx.stockLedger.create({
                data: {
                    productVariantId: variantId,
                    destinationBinId: binId,
                    quantityCount: qty,
                    type: 'ADJUSTMENT',
                    reference: `ADJ-ADD-${Date.now()}`,
                    notes: "Manual inventory adjustment stock addition."
                }
            });

            return balance;
        } else {
            const existingRecord = await tx.inventoryBalance.findUnique({
                where: {
                    productVariantId_binId_batchId: { productVariantId: variantId, binId: binId, batchId: batchId }
                }
            });

            if (!existingRecord || existingRecord.currentCount < qty) {
                throw new Error("Insufficient stock in the specified bin for this batch operation.");
            }

            const balance = await tx.inventoryBalance.update({
                where: { id: existingRecord.id },
                data: { currentCount: { decrement: qty } }
            });

            await tx.stockLedger.create({
                data: {
                    productVariantId: variantId,
                    sourceBinId: binId,
                    quantityCount: -Math.abs(qty),
                    type: 'ADJUSTMENT',
                    reference: `ADJ-SUB-${Date.now()}`,
                    notes: "Manual inventory adjustment stock reduction."
                }
            });

            return balance;
        }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

const executeTransfer = async (variantId, batchId, sourceBinId, destinationBinId, quantity) => {
    return await prisma.$transaction(async (tx) => {
        const qty = Number(quantity);

        const source = await tx.inventoryBalance.findUnique({
            where: { productVariantId_binId_batchId: { productVariantId: variantId, binId: sourceBinId, batchId: batchId } }
        });

        if (!source || source.currentCount < qty) throw new Error("Insufficient stock in source bin.");

        await checkBinCapacity(tx, destinationBinId, variantId, qty);

        await tx.inventoryBalance.update({
            where: { id: source.id },
            data: { currentCount: { decrement: qty } }
        });

        const destination = await tx.inventoryBalance.upsert({
            where: { productVariantId_binId_batchId: { productVariantId: variantId, binId: destinationBinId, batchId: batchId } },
            update: { currentCount: { increment: qty } },
            create: { productVariantId: variantId, binId: destinationBinId, batchId: batchId, currentCount: qty }
        });

        await tx.stockLedger.create({
            data: {
                productVariantId: variantId,
                sourceBinId: sourceBinId,
                destinationBinId: destinationBinId,
                quantityCount: qty,
                type: 'INTERNAL_TRANSFER',
                reference: `TRSF-${Date.now()}`,
                notes: "Direct stock execution movement."
            }
        });

        return destination;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

// ==========================================
// 2. INBOUND LOGISTICS (GRN)
// ==========================================

const processGRN = async (purchaseOrderId, items, userId, grnNumber) => {
    return await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: { items: true }
        });

        if (!po) throw new Error("Purchase Order not found.");
        if (po.status === 'RECEIVED') throw new Error("This PO has already been fully received.");

        for (const item of items) {
            const poItem = po.items.find(pi => pi.productVariantId === item.variantId);
            if (!poItem) throw new Error(`Item ${item.variantId} not found in the PO.`);
            if (item.qty > poItem.quantityCount) {
                throw new Error(`Quantity mismatch for variant ${item.variantId}.`);
            }
            await checkBinCapacity(tx, item.binId, item.variantId, item.qty);
        }

        const grn = await tx.gRN.create({
            data: {
                grnNumber: grnNumber,
                purchaseOrderId: purchaseOrderId,
                receivedBy: userId,
                items: {
                    create: items.map(item => ({
                        productVariantId: item.variantId,
                        binId: item.binId,
                        quantityCount: item.qty,
                        quantityKg: item.quantityKg || 0
                    }))
                }
            }
        });

        for (const item of items) {
            await tx.inventoryBalance.upsert({
                where: {
                    productVariantId_binId_batchId: { productVariantId: item.variantId, binId: item.binId, batchId: item.batchId }
                },
                update: {
                    totalPurchasedCount: { increment: item.qty },
                    currentCount: { increment: item.qty },
                    currentKg: { increment: item.quantityKg || 0 },
                    lastStockMovement: new Date()
                },
                create: {
                    productVariantId: item.variantId,
                    binId: item.binId,
                    batchId: item.batchId,
                    totalPurchasedCount: item.qty,
                    currentCount: item.qty,
                    currentKg: item.quantityKg || 0
                }
            });

            await tx.stockLedger.create({
                data: {
                    productVariantId: item.variantId,
                    destinationBinId: item.binId,
                    quantityCount: item.qty,
                    quantityKg: item.quantityKg || 0,
                    type: 'INITIAL_PO_RECEIVE',
                    reference: grnNumber,
                    notes: `Received via GRN: ${grnNumber}`
                }
            });
        }

        await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: 'RECEIVED' }
        });

        return grn;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

// ==========================================
// 3. REVERSE LOGISTICS (PURCHASE RETURNS)
// ==========================================

const processPurchaseReturn = async (purchaseOrderId, items, userId, notes, refundAmount) => {
    return await prisma.$transaction(async (tx) => {
        const returnNumber = `RET-${Date.now()}`;

        const purchaseReturn = await tx.purchaseReturn.create({
            data: {
                returnNumber,
                purchaseOrderId,
                processedBy: userId,
                notes,
                refundAmount,
                items: {
                    create: items.map(item => ({
                        productVariantId: item.variantId,
                        binId: item.binId,
                        quantityCount: item.qty,
                        reason: item.reason
                    }))
                }
            }
        });

        for (const item of items) {
            const currentBalance = await tx.inventoryBalance.findUnique({
                where: {
                    productVariantId_binId_batchId: { productVariantId: item.variantId, binId: item.binId, batchId: item.batchId }
                }
            });

            if (!currentBalance || currentBalance.currentCount < item.qty) {
                throw new Error(`Insufficient stock in bin for Variant ${item.variantId}.`);
            }

            await tx.inventoryBalance.update({
                where: {
                    productVariantId_binId_batchId: { productVariantId: item.variantId, binId: item.binId, batchId: item.batchId }
                },
                data: {
                    currentCount: { decrement: item.qty },
                    totalPurchasedCount: { decrement: item.qty },
                    lastStockMovement: new Date()
                }
            });

            await tx.stockLedger.create({
                data: {
                    productVariantId: item.variantId,
                    sourceBinId: item.binId,
                    quantityCount: -Math.abs(item.qty),
                    type: 'PURCHASE_RETURN',
                    reference: returnNumber,
                    notes: `Return ${returnNumber}. Reason: ${item.reason}`
                }
            });
        }

        return purchaseReturn;
    });
};

// ==========================================
// 4. WAREHOUSE ROUTING (INTERNAL TRANSFERS)
// ==========================================

const processInternalTransfer = async (items, userId, notes) => {
    return await prisma.$transaction(async (tx) => {
        const transferRef = `IT-${Date.now()}`;

        const internalTransfer = await tx.internalTransfer.create({
            data: {
                transferRef,
                processedBy: userId,
                notes,
                items: {
                    create: items.map(item => ({
                        productVariantId: item.variantId,
                        sourceBinId: item.sourceBinId,
                        destinationBinId: item.destinationBinId,
                        quantityCount: item.qty,
                        quantityKg: item.quantityKg || 0
                    }))
                }
            }
        });

        for (const item of items) {
            const sourceBalance = await tx.inventoryBalance.findUnique({
                where: {
                    productVariantId_binId_batchId: { productVariantId: item.variantId, binId: item.sourceBinId, batchId: item.batchId }
                }
            });

            if (!sourceBalance || sourceBalance.currentCount < item.qty) {
                throw new Error(`Insufficient stock in Source Bin for Variant ${item.variantId}.`);
            }

            await checkBinCapacity(tx, item.destinationBinId, item.variantId, item.qty);

            await tx.inventoryBalance.update({
                where: { id: sourceBalance.id },
                data: {
                    currentCount: { decrement: item.qty },
                    lastStockMovement: new Date()
                }
            });

            await tx.inventoryBalance.upsert({
                where: {
                    productVariantId_binId_batchId: { productVariantId: item.variantId, binId: item.destinationBinId, batchId: item.batchId }
                },
                update: {
                    currentCount: { increment: item.qty },
                    lastStockMovement: new Date()
                },
                create: {
                    productVariantId: item.variantId,
                    binId: item.destinationBinId,
                    batchId: item.batchId,
                    currentCount: item.qty,
                    lastStockMovement: new Date()
                }
            });

            await tx.stockLedger.create({
                data: {
                    productVariantId: item.variantId,
                    sourceBinId: item.sourceBinId,
                    destinationBinId: item.destinationBinId,
                    quantityCount: item.qty,
                    type: 'INTERNAL_TRANSFER',
                    reference: transferRef,
                    notes: notes || `Internal transfer by user ${userId}`
                }
            });
        }
        return internalTransfer;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

// ==========================================
// 5. SALES OUTBOUND (FIFO ALLOCATION & DISPATCH)
// ==========================================

const createSalesOrder = async (salesOrderData, items, userId) => {
    return await prisma.$transaction(async (tx) => {
        const orderRef = `SO-${Date.now()}`;
        const invoiceNumber = salesOrderData.invoiceNumber || `INV-${Date.now()}`;

        const salesOrder = await tx.salesOrder.create({
            data: {
                invoiceNumber,
                orderRef,
                buyerName: salesOrderData.buyerName || "Walk-in Customer",
                createdById: userId,
                partnerId: salesOrderData.partnerId,
                customerId: salesOrderData.customerId,
                totalAmount: parseFloat(salesOrderData.totalAmount) || 0,
                receivedAmount: parseFloat(salesOrderData.receivedAmount) || 0,
                balanceDue: (parseFloat(salesOrderData.totalAmount) || 0) - (parseFloat(salesOrderData.receivedAmount) || 0),
                paymentMethod: salesOrderData.paymentMethod,
                status: 'PENDING_DISPATCH',
                notes: salesOrderData.notes || null
            }
        });

        for (const item of items) {
            const calculatedTotalLinePrice = (parseInt(item.qty, 10) * parseFloat(item.unitPrice || 0));

            const orderItem = await tx.salesOrderItem.create({
                data: {
                    salesOrderId: salesOrder.id,
                    productVariantId: item.variantId,
                    orderedQuantity: parseInt(item.qty, 10),
                    quantityCount: parseInt(item.qty, 10),
                    unitPrice: parseFloat(item.unitPrice) || 0,
                    totalPrice: calculatedTotalLinePrice
                }
            });

            const availableStock = await tx.inventoryBalance.findMany({
                where: { productVariantId: item.variantId, currentCount: { gt: 0 } },
                orderBy: { createdAt: 'asc' } // Enforces historical FIFO queue picking routing
            });

            let remainingToFulfill = parseInt(item.qty, 10);
            const allocationsToCreate = [];

            for (const balance of availableStock) {
                if (remainingToFulfill <= 0) break;

                const unitsToTake = Math.min(balance.currentCount, remainingToFulfill);

                allocationsToCreate.push({
                    salesOrderItemId: orderItem.id,
                    batchId: balance.batchId,
                    binId: balance.binId,
                    allocatedCount: unitsToTake
                });

                remainingToFulfill -= unitsToTake;
            }

            if (remainingToFulfill > 0) {
                throw new Error(`Insufficient total stock for Variant ID ${item.variantId}. Short by ${remainingToFulfill} units.`);
            }

            await tx.stockAllocation.createMany({ data: allocationsToCreate });
        }

        return salesOrder;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

const dispatchSalesOrder = async (salesOrderId, userId) => {
    return await prisma.$transaction(async (tx) => {
        const order = await tx.salesOrder.findUnique({
            where: { id: salesOrderId },
            include: { items: { include: { allocations: true } } }
        });

        if (!order || order.status !== 'PENDING_DISPATCH') {
            throw new Error("Order is not pending dispatch or does not exist.");
        }

        for (const item of order.items) {
            for (const allocation of item.allocations) {
                const targetBalance = await tx.inventoryBalance.findUnique({
                    where: {
                        productVariantId_binId_batchId: {
                            productVariantId: item.productVariantId,
                            binId: allocation.binId,
                            batchId: allocation.batchId
                        }
                    }
                });

                if (!targetBalance) throw new Error("Inventory record balance mismatch during outbound dispatch step.");

                await tx.inventoryBalance.update({
                    where: { id: targetBalance.id },
                    data: {
                        currentCount: { decrement: allocation.allocatedCount },
                        lastStockMovement: new Date()
                    }
                });

                await tx.productVariant.update({
                    where: { id: item.productVariantId },
                    data: { currentStock: { decrement: allocation.allocatedCount } }
                });

                await tx.stockLedger.create({
                    data: {
                        productVariantId: item.productVariantId,
                        sourceBinId: targetBalance.binId,
                        quantityCount: -Math.abs(allocation.allocatedCount),
                        type: 'SALES_OUTBOUND',
                        reference: order.invoiceNumber,
                        notes: `Dispatched for Invoice: ${order.invoiceNumber}`
                    }
                });
            }
        }

        return await tx.salesOrder.update({
            where: { id: salesOrderId },
            data: { status: 'DISPATCHED' }
        });
    });
};

// Bundle all functions into a default export object
export default {
    getAllInventory,
    updateStock,
    executeTransfer,
    processGRN,
    processPurchaseReturn,
    processInternalTransfer,
    createSalesOrder,
    dispatchSalesOrder
};