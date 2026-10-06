import prisma from '../lib/prisma.js';

/**
 * Atomic Stock Movement Service
 * Ensures data integrity across Bin capacity, Inventory counts, and Audit Ledger.
 */
export const executeStockMove = async (tx, params) => {
    const {
        sourceBinId,
        destBinId,
        productVariantId,
        batchId,
        weight = 0,
        volume = 0,
        quantity,
        type,
        reference,
        notes
    } = params;

    // Use passed transaction or fallback to global Prisma client
    const prismaClient = tx || prisma;

    if (quantity <= 0) {
        throw new Error("INVALID_QUANTITY|Stock movement quantity must be greater than zero.");
    }

    let effectiveSourceBatchId = batchId || "";

    // 1. DEDUCT from Source (If applicable)
    if (sourceBinId) {
        // A. Find Inventory Balance with fallback for batchId (READ FIRST)
        let inventoryBalance = await prismaClient.inventoryBalance.findUnique({
            where: {
                productVariantId_binId_batchId: {
                    productVariantId,
                    binId: sourceBinId,
                    batchId: effectiveSourceBatchId
                }
            }
        });

        if (!inventoryBalance || inventoryBalance.currentCount < quantity) {
            // Fallback: Find any active balance for this variant in this bin
            const alternativeBalance = await prismaClient.inventoryBalance.findFirst({
                where: {
                    binId: sourceBinId,
                    productVariantId: productVariantId,
                    currentCount: { gte: quantity } // Ensure the fallback actually has enough stock
                }
            });

            if (alternativeBalance) {
                inventoryBalance = alternativeBalance;
                effectiveSourceBatchId = alternativeBalance.batchId;
            }
        }

        // B. Validate Stock Availability
        if (!inventoryBalance || inventoryBalance.currentCount < quantity) {
            throw new Error(
                `INSUFFICIENT_STOCK|Cannot move ${quantity} units. ` +
                `Bin ${sourceBinId} does not have enough stock available for this variant/batch.`
            );
        }

        // C. Update Bin Capacity (WRITE)
        await prismaClient.bin.update({
            where: { id: sourceBinId },
            data: {
                currentWeight: { decrement: weight },
                currentVolume: { decrement: volume }
            }
        });

        // D. Decrement Inventory Balance (WRITE)
        await prismaClient.inventoryBalance.update({
            where: {
                productVariantId_binId_batchId: {
                    productVariantId,
                    binId: sourceBinId,
                    batchId: effectiveSourceBatchId
                }
            },
            data: {
                currentCount: { decrement: quantity },
                currentKg: { decrement: weight }
            }
        });
    }

// 2. ADD to Destination (Only if destBinId is provided)
    if (destBinId) {
        const effectiveDestBatchId = batchId || "";

        // A. Update Bin Capacity
        await prismaClient.bin.update({
            where: { id: destBinId },
            data: {
                currentWeight: { increment: weight },
                currentVolume: { increment: volume }
            }
        });

        // B. Increment/Upsert Inventory Balance
        await prismaClient.inventoryBalance.upsert({
            where: {
                productVariantId_binId_batchId: {
                    productVariantId: productVariantId,
                    binId: destBinId,
                    batchId: effectiveDestBatchId
                }
            },
            update: {
                currentCount: { increment: quantity },
                currentKg: { increment: weight }
            },
            create: {
                productVariantId: productVariantId,
                binId: destBinId,
                batchId: effectiveDestBatchId,
                currentCount: quantity,
                currentKg: weight
                // REMOVED: currentVolume: volume
            }
        });
    }

    // 3. THE AUDIT TRAIL (The "Double-Entry" requirement)
    await prismaClient.stockLedger.create({
        data: {
            productVariantId,
            sourceBinId: sourceBinId || null,
            destinationBinId: destBinId || null,
            quantityCount: quantity,
            quantityKg: weight,
            type: type,
            reference: reference,
            notes: notes
        }
    });

    return { success: true };
};

// Export as a default object so the controller can import it
export default {
    executeStockMove
};