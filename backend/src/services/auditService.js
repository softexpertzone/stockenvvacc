const prisma = require('../lib/prisma');

exports.reconcileStock = async (data, userId) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Fetch current system state
        const currentBalance = await tx.inventoryBalance.findUnique({
            where: {
                productVariantId_rackId: {
                    productVariantId: data.productVariantId,
                    rackId: data.rackId
                }
            }
        });

        if (!currentBalance) throw new Error("No inventory record found for this rack/product.");

        // 2. Calculate Variance
        const variance = data.physicalCount - currentBalance.currentCount;

        // 3. Update Balance
        await tx.inventoryBalance.update({
            where: { id: currentBalance.id },
            data: {
                currentCount: { increment: variance },
                lastStockMovement: new Date()
            }
        });

        // 4. Create Immutable Audit Log
        await tx.stockLog.create({
            data: {
                productVariantId: data.productVariantId,
                sourceRackId: data.rackId,
                quantityCount: variance, // The change amount
                type: 'ADJUSTMENT',
                notes: `AUDIT: Found ${data.physicalCount} (System: ${currentBalance.currentCount}). Reason: ${data.reason}. ${data.notes || ''}`
            }
        });

        return { success: true, variance, previousCount: currentBalance.currentCount };
    });
};