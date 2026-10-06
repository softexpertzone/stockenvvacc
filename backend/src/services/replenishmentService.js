const prisma = require('../lib/prisma');

exports.getReplenishmentSuggestions = async () => {
    // 1. Get total stock aggregated by product
    const currentStockLevels = await prisma.inventoryBalance.groupBy({
        by: ['productVariantId'],
        _sum: {
            currentCount: true,
        },
    });

    // 2. Fetch all product details including the reorder threshold
    const products = await prisma.productVariant.findMany();

    // 3. Compare and filter (The Intelligence Logic)
    const suggestions = products
        .map(product => {
            const stock = currentStockLevels.find(s => s.productVariantId === product.id);
            const totalStock = stock?._sum.currentCount || 0;
            return {
                ...product,
                totalStock,
                isLowStock: totalStock < product.reorderPoint
            };
        })
        .filter(p => p.isLowStock); // Return only items that need restocking

    return suggestions;
};