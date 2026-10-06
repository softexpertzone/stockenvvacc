import prisma from '../lib/prisma.js';

export const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);

        const safe = async (fn, fallback) => {
            try {
                return await fn();
            } catch (e) {
                console.warn('[Dashboard] soft fail:', e.message);
                return fallback;
            }
        };

        const [
            arData,
            apData,
            lowStockResult,
            todaySalesAgg,
            monthSalesAgg,
            todayPurchaseAgg,
            monthPurchaseAgg,
            todayOrderCount,
            monthOrderCount,
            todayPOCount,
            monthPOCount,
            totalVariants,
            topProductsRaw,
            pendingDeliveries,
            pendingReceipts
        ] = await Promise.all([
            safe(
                () =>
                    prisma.salesOrder.aggregate({
                        _sum: { balanceDue: true },
                        where: { balanceDue: { gt: 0 } }
                    }),
                { _sum: { balanceDue: 0 } }
            ),

            safe(
                () =>
                    prisma.purchaseOrder.aggregate({
                        _sum: { dueAmount: true },
                        where: { dueAmount: { gt: 0 } }
                    }),
                { _sum: { dueAmount: 0 } }
            ),

            safe(
                () =>
                    prisma.$queryRaw`
                        SELECT COUNT(*) as count
                        FROM "ProductVariant"
                        WHERE "currentStock" <= "minStockLevel"
                    `,
                [{ count: 0 }]
            ),

            safe(
                () =>
                    prisma.salesOrder.aggregate({
                        _sum: { totalAmount: true },
                        where: { createdAt: { gte: todayStart } }
                    }),
                { _sum: { totalAmount: 0 } }
            ),

            safe(
                () =>
                    prisma.salesOrder.aggregate({
                        _sum: { totalAmount: true },
                        where: { createdAt: { gte: monthStart } }
                    }),
                { _sum: { totalAmount: 0 } }
            ),

            safe(async () => {
                try {
                    return await prisma.purchaseOrder.aggregate({
                        _sum: { grandTotal: true },
                        where: { createdAt: { gte: todayStart } }
                    });
                } catch {
                    return await prisma.purchaseOrder.aggregate({
                        _sum: { totalAmount: true },
                        where: { createdAt: { gte: todayStart } }
                    });
                }
            }, { _sum: { grandTotal: 0, totalAmount: 0 } }),

            safe(async () => {
                try {
                    return await prisma.purchaseOrder.aggregate({
                        _sum: { grandTotal: true },
                        where: { createdAt: { gte: monthStart } }
                    });
                } catch {
                    return await prisma.purchaseOrder.aggregate({
                        _sum: { totalAmount: true },
                        where: { createdAt: { gte: monthStart } }
                    });
                }
            }, { _sum: { grandTotal: 0, totalAmount: 0 } }),

            safe(
                () =>
                    prisma.salesOrder.count({
                        where: { createdAt: { gte: todayStart } }
                    }),
                0
            ),
            safe(
                () =>
                    prisma.salesOrder.count({
                        where: { createdAt: { gte: monthStart } }
                    }),
                0
            ),
            safe(
                () =>
                    prisma.purchaseOrder.count({
                        where: { createdAt: { gte: todayStart } }
                    }),
                0
            ),
            safe(
                () =>
                    prisma.purchaseOrder.count({
                        where: { createdAt: { gte: monthStart } }
                    }),
                0
            ),
            safe(() => prisma.productVariant.count(), 0),

            safe(async () => {
                try {
                    return await prisma.salesOrderItem.groupBy({
                        by: ['productVariantId'],
                        _sum: { orderedQuantity: true },
                        where: { salesOrder: { createdAt: { gte: monthStart } } },
                        orderBy: { _sum: { orderedQuantity: 'desc' } },
                        take: 5
                    });
                } catch {
                    try {
                        return await prisma.salesOrderItem.groupBy({
                            by: ['productVariantId'],
                            _sum: { quantityCount: true },
                            where: { salesOrder: { createdAt: { gte: monthStart } } },
                            orderBy: { _sum: { quantityCount: 'desc' } },
                            take: 5
                        });
                    } catch {
                        return [];
                    }
                }
            }, []),

            // Only statuses known from salesController
            safe(
                () =>
                    prisma.salesOrder.count({
                        where: {
                            status: { in: ['ALLOCATED_PENDING', 'ALLOCATED_PAID'] }
                        }
                    }),
                0
            ),

            // Only statuses known from purchaseController
            safe(
                () =>
                    prisma.purchaseOrder.count({
                        where: { status: 'PENDING' }
                    }),
                0
            )
        ]);

        const lowStockCount = Number(
            Array.isArray(lowStockResult) ? lowStockResult[0]?.count ?? 0 : 0
        );

        let topProducts = [];
        if (Array.isArray(topProductsRaw) && topProductsRaw.length > 0) {
            topProducts = await Promise.all(
                topProductsRaw.map(async (item) => {
                    const variant = await safe(
                        () =>
                            prisma.productVariant.findUnique({
                                where: { id: item.productVariantId },
                                select: {
                                    sku: true,
                                    name: true,
                                    product: { select: { name: true } }
                                }
                            }),
                        null
                    );

                    const sumObj = item._sum || {};
                    const qty =
                        Number(
                            sumObj.orderedQuantity ??
                            sumObj.quantityCount ??
                            sumObj.quantity ??
                            0
                        ) || 0;

                    return {
                        productVariantId: item.productVariantId,
                        qty,
                        sku: variant?.sku || '—',
                        name:
                            variant?.name ||
                            variant?.product?.name ||
                            String(item.productVariantId).slice(0, 12) + '…'
                    };
                })
            );
        }

        const pickSum = (agg, keys) => {
            if (!agg || !agg._sum) return 0;
            for (const k of keys) {
                if (agg._sum[k] != null) return Number(agg._sum[k]) || 0;
            }
            return 0;
        };

        res.json({
            success: true,
            data: {
                totalAR: Number(arData._sum?.balanceDue) || 0,
                totalAP: Number(apData._sum?.dueAmount) || 0,

                dailySales: pickSum(todaySalesAgg, ['totalAmount']),
                monthlySales: pickSum(monthSalesAgg, ['totalAmount']),
                todayOrderCount: Number(todayOrderCount) || 0,
                monthOrderCount: Number(monthOrderCount) || 0,

                dailyPurchases: pickSum(todayPurchaseAgg, [
                    'grandTotal',
                    'totalAmount'
                ]),
                monthlyPurchases: pickSum(monthPurchaseAgg, [
                    'grandTotal',
                    'totalAmount'
                ]),
                todayPOCount: Number(todayPOCount) || 0,
                monthPOCount: Number(monthPOCount) || 0,

                lowStockCount,
                totalVariants: Number(totalVariants) || 0,
                pendingReceipts: Number(pendingReceipts) || 0,
                pendingDeliveries: Number(pendingDeliveries) || 0,

                topProducts,

                period: {
                    today: todayStart.toISOString().slice(0, 10),
                    monthStart: monthStart.toISOString().slice(0, 10),
                    monthLabel: now.toLocaleString('default', {
                        month: 'long',
                        year: 'numeric'
                    })
                }
            }
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            error: 'Dashboard sync failed: ' + error.message
        });
    }
};
