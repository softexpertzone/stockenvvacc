// backend/src/services/skuService.js
import prisma from '../lib/prisma.js';

export async function generateSKU(categoryId, brandId, attributes = []) {
    // 1. Fetch Codes
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { code: true } });
    const catCode = (category?.code || 'CAT').substring(0, 3).toUpperCase();

    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { code: true } });
    const brandCode = (brand?.code || 'GEN').substring(0, 3).toUpperCase();

    const prefix = `${catCode}-${brandCode}`;

    // 2. FIND THE HIGHEST EXISTING SKU (The only way to guarantee uniqueness)
    const latestProduct = await prisma.product.findFirst({
        where: { sku: { startsWith: prefix } },
        orderBy: { sku: 'desc' },
        select: { sku: true }
    });

    let nextNumber = 1;
    if (latestProduct) {
        // Assume format: CAT-GEN-0001
        const parts = latestProduct.sku.split('-');
        // If your SKU structure is complex, ensure this index targets the number
        const lastPart = parts.find(p => !isNaN(parseInt(p, 10)) && p.length >= 3);
        if (lastPart) nextNumber = parseInt(lastPart, 10) + 1;
    }

    const sequence = String(nextNumber).padStart(4, '0');
    let sku = `${prefix}-${sequence}`;

    // 3. Append Attributes
    if (attributes && attributes.length > 0) {
        const attrStrings = attributes.map(a => String(a.value).substring(0, 3).toUpperCase());
        sku += `-${attrStrings.join('-')}`;
    }

    return sku;
}