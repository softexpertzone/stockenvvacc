// src/controllers/skuController.js
const prisma = require('../lib/prisma');

exports.getNextSkuSequence = async (req, res) => {
    const { categoryId, brandId } = req.query;
    try {
        // Find Category/Brand codes for the prefix
        const cat = await prisma.category.findUnique({ where: { id: categoryId } });
        const brd = await prisma.brand.findUnique({ where: { id: brandId } });

        // Count products to generate sequence
        const count = await prisma.product.count({ where: { categoryId, brandId } });
        const sequence = String(count + 1).padStart(4, '0');

        res.json({ sku: `${cat.code}-${brd.code}-${sequence}`.toUpperCase() });
    } catch (error) {
        res.status(500).json({ error: "Failed to generate sequence" });
    }
};