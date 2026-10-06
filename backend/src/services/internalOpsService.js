import prisma from '../lib/prisma.js';

// Temporary stubs so the server can start
export const transferStock = async () => {
    throw new Error("transferStock is not implemented yet");
};

export const adjustStock = async () => {
    throw new Error("adjustStock is not implemented yet");
};

export const processBulkSortingReevaluation = async (data, userId) => {
    const { godownId, items } = data;

    if (!godownId || !items || !Array.isArray(items) || items.length === 0) {
        throw new Error("Warehouse (godownId) and items are required for re-evaluation.");
    }

    // Fallback to a real user if authentication is missing / DEV_SYSTEM_USER
    const performedById = (userId && userId !== 'DEV_SYSTEM_USER')
        ? userId
        : '0e16e4ea-319a-4392-83e7-3096903df542';

    return await prisma.$transaction(async (tx) => {
        // 1. Create the Re-evaluation Header
        const reevaluation = await tx.stockReevaluation.create({
            data: {
                performedById: performedById,
                notes: "Manual warehouse bulk SKU conversion"
            }
        });

        for (const item of items) {
            const { originalVariantId, newVariantId, quantity } = item;
            const qty = parseInt(quantity, 10);

            if (!originalVariantId || !newVariantId || isNaN(qty) || qty <= 0) {
                throw new Error("Each item must have a valid Original SKU, New SKU, and quantity greater than zero.");
            }

            // Resolve SKU code OR UUID → real ProductVariant
            const [originalVariant, newVariant] = await Promise.all([
                tx.productVariant.findFirst({
                    where: {
                        OR: [
                            { id: originalVariantId },
                            { sku: originalVariantId },
                            { barcode: originalVariantId }
                        ]
                    }
                }),
                tx.productVariant.findFirst({
                    where: {
                        OR: [
                            { id: newVariantId },
                            { sku: newVariantId },
                            { barcode: newVariantId }
                        ]
                    }
                })
            ]);

            if (!originalVariant) {
                throw new Error(`Original SKU not found: ${originalVariantId}`);
            }
            if (!newVariant) {
                throw new Error(`New SKU not found: ${newVariantId}`);
            }

            if (originalVariant.id === newVariant.id) {
                throw new Error(`Original and New SKU cannot be the same (${originalVariantId}).`);
            }

            const originalVariantUUID = originalVariant.id;
            const newVariantUUID = newVariant.id;

            // 2. Locate available stock balances
            const sourceBalances = await tx.inventoryBalance.findMany({
                where: {
                    productVariantId: originalVariantUUID,
                    bin: {
                        godownId: godownId
                    },
                    currentCount: { gt: 0 }
                },
                include: { bin: true },
                orderBy: { currentCount: 'desc' }
            });

            const totalAvailable = sourceBalances.reduce((sum, b) => sum + b.currentCount, 0);

            if (totalAvailable < qty) {
                throw new Error(
                    `Insufficient stock for original SKU in the selected warehouse. ` +
                    `Requested: ${qty}, Available: ${totalAvailable}. ` +
                    `SKU: ${originalVariantId}, Godown: ${godownId}`
                );
            }

            let remainingToDeduct = qty;

            for (const sourceBalance of sourceBalances) {
                if (remainingToDeduct <= 0) break;

                const deductFromThisBatch = Math.min(sourceBalance.currentCount, remainingToDeduct);
                const binId = sourceBalance.binId;
                const batchId = sourceBalance.batchId;

                // Create StockReevaluationItem
                await tx.stockReevaluationItem.create({
                    data: {
                        reevaluationId: reevaluation.id,
                        originalVariantId: originalVariantUUID,
                        newVariantId: newVariantUUID,
                        binId,
                        batchId,
                        quantityConverted: deductFromThisBatch
                    }
                });

                // Deduct from original
                await tx.inventoryBalance.update({
                    where: { id: sourceBalance.id },
                    data: { currentCount: { decrement: deductFromThisBatch } }
                });

                // Add to new variant (same bin + batch)
                await tx.inventoryBalance.upsert({
                    where: {
                        productVariantId_binId_batchId: {
                            productVariantId: newVariantUUID,
                            binId: binId,
                            batchId: batchId
                        }
                    },
                    update: {
                        currentCount: { increment: deductFromThisBatch }
                    },
                    create: {
                        productVariantId: newVariantUUID,
                        binId: binId,
                        batchId: batchId,
                        currentCount: deductFromThisBatch,
                        allocatedCount: 0,
                        currentKg: 0
                    }
                });

                const auditNotes = `Converted ${deductFromThisBatch} pcs. Ref: Reevaluation ${reevaluation.id}`;

                // StockLedger - OUT is negative, IN is positive
                await tx.stockLedger.createMany({
                    data: [
                        {
                            productVariantId: originalVariantUUID,
                            sourceBinId: binId,
                            quantityCount: -deductFromThisBatch,   // negative for OUT
                            type: 'SORTING_RECLASSIFICATION',
                            reference: reevaluation.id,
                            notes: `OUT: -${deductFromThisBatch} pcs (Mislabeled) | ${auditNotes}`
                        },
                        {
                            productVariantId: newVariantUUID,
                            destinationBinId: binId,
                            quantityCount: deductFromThisBatch,    // positive for IN
                            type: 'SORTING_RECLASSIFICATION',
                            reference: reevaluation.id,
                            notes: `IN: +${deductFromThisBatch} pcs (Corrected) | ${auditNotes}`
                        }
                    ]
                });

                // StockMovement
                await tx.stockMovement.createMany({
                    data: [
                        {
                            type: 'SORTING_RECLASSIFICATION',
                            referenceId: reevaluation.id,
                            quantity: -deductFromThisBatch,
                            productVariantId: originalVariantUUID,
                            binId: binId,
                            batchId: batchId
                        },
                        {
                            type: 'SORTING_RECLASSIFICATION',
                            referenceId: reevaluation.id,
                            quantity: deductFromThisBatch,
                            productVariantId: newVariantUUID,
                            binId: binId,
                            batchId: batchId
                        }
                    ]
                });

                remainingToDeduct -= deductFromThisBatch;
            }
        }

        return reevaluation;
    });
};