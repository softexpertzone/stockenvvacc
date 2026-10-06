import prisma from '../lib/prisma.js';

/**
 * GET /api/inventory/batches
 * Query: ?productVariantId=xxx&binId=yyy
 */
export const getBatches = async (req, res, next) => {
    try {
        const { productVariantId, binId } = req.query;

        if (!productVariantId) {
            return res.status(400).json({
                success: false,
                message: 'productVariantId is required',
            });
        }

        const where = {
            productVariantId,
        };

        if (binId) {
            where.inventoryBalances = {
                some: {
                    binId,
                    currentCount: { gt: 0 },
                },
            };
        }

        const batches = await prisma.batch.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
                createdAt: true,
                productVariantId: true,
                inventoryBalances: {
                    where: binId
                        ? { binId, currentCount: { gt: 0 } }
                        : { currentCount: { gt: 0 } },
                    select: {
                        binId: true,
                        currentCount: true,
                        allocatedCount: true,
                    },
                },
            },
        });

        // Add availableQty for the UI
        const data = batches.map((b) => {
            const balances = b.inventoryBalances || [];
            const totalCurrent = balances.reduce((s, ib) => s + Number(ib.currentCount || 0), 0);
            const totalAllocated = balances.reduce((s, ib) => s + Number(ib.allocatedCount || 0), 0);
            const availableQty = Math.max(0, totalCurrent - totalAllocated);

            return {
                id: b.id,
                batchNumber: b.batchNumber,
                expiryDate: b.expiryDate,
                createdAt: b.createdAt,
                productVariantId: b.productVariantId,
                availableQty,
            };
        });

        // Only keep batches that still have available stock
        const filtered = data.filter((b) => b.availableQty > 0);

        res.json({
            success: true,
            data: filtered,
        });
    } catch (error) {
        next(error);
    }
};