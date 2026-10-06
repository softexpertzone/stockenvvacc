import prisma from '../lib/prisma.js'; // FIXED: Switched to ESM import with .js extension

/**
 * Creates a product, its variants (with dynamic attributes), and ensures
 * business logic validation in a single transaction.
 */
export const createProductService = async (data, userId) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Verify existence of Category, Brand, UOM, and Tax
        const [category, uom, brand] = await Promise.all([
            data.categoryId ? tx.category.findUnique({ where: { id: data.categoryId } }) : Promise.resolve(true),
            data.uomId ? tx.uomMaster.findUnique({ where: { id: data.uomId } }) : Promise.resolve(true),
            tx.brand.findUnique({ where: { id: data.brandId } })
        ]);

        if (data.categoryId && !category) throw new Error("Invalid Category ID");
        if (data.uomId && !uom) throw new Error("Invalid UOM ID");
        if (!brand) throw new Error("Invalid Brand ID");

        // 2. Create the product and nested variants + attributes
        const product = await tx.product.create({
            data: {
                name: data.name,
                sku: data.sku,
                brandId: data.brandId,
                subBrandId: data.subBrandId,
                categoryId: data.categoryId,
                uomId: data.uomId,
                taxId: data.taxId,
                createdById: userId,
                productVariants: {
                    create: (data.variants || []).map(v => {

                        // --- VOLUMETRIC MATH ENGINE ---
                        let calculatedVolume = null;
                        if (v.lengthCm && v.widthCm && v.heightCm) {
                            calculatedVolume = v.lengthCm * v.widthCm * v.heightCm;
                        }
                        // ------------------------------

                        return {
                            sku: v.sku,
                            price: v.price,
                            purchasePrice: v.purchasePrice,
                            minStockLevel: v.minStockLevel || 0,

                            // Map new spatial dimensions safely
                            lengthCm: v.lengthCm || null,
                            widthCm: v.widthCm || null,
                            heightCm: v.heightCm || null,
                            weightKg: v.weightKg || null,
                            volumeCm3: calculatedVolume,

                            attributes: {
                                create: (v.attributes || []).map(attr => ({
                                    attributeDefId: attr.attributeDefId,
                                    attributeValueId: attr.attributeValueId
                                }))
                            }
                        };
                    })
                }
            },
            include: {
                productVariants: { include: { attributes: true } }
            }
        });

        // 3. Create Audit Log
        await tx.auditLog.create({
            data: {
                entity: 'PRODUCT',
                entityId: product.id,
                action: 'CREATE',
                operation: 'PRODUCT_REGISTRATION',
                userId: userId,
                newValue: JSON.parse(JSON.stringify(product))
            }
        });

        return product;
    });
};

/**
 * Retrieves all products with their relational data and attributes.
 */
export const getAllProductsService = async () => {
    return await prisma.product.findMany({
        include: {
            productVariants: {
                include: {
                    attributes: {
                        include: {
                            attributeDef: true,
                            attributeValue: true
                        }
                    }
                }
            },
            brand: true,
            category: true,
            uom: true,
            tax: true
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Creates a standalone variant for an existing product with dynamic attributes.
 */
export const createVariantService = async (data) => {

    // --- VOLUMETRIC MATH ENGINE ---
    let calculatedVolume = null;
    if (data.lengthCm && data.widthCm && data.heightCm) {
        calculatedVolume = data.lengthCm * data.widthCm * data.heightCm;
    }
    // ------------------------------

    return await prisma.productVariant.create({
        data: {
            productId: data.productId,
            sku: data.sku,
            price: data.price,
            purchasePrice: data.purchasePrice,
            minStockLevel: data.minStockLevel || 0,

            // Map new spatial dimensions safely
            lengthCm: data.lengthCm || null,
            widthCm: data.widthCm || null,
            heightCm: data.heightCm || null,
            weightKg: data.weightKg || null,
            volumeCm3: calculatedVolume,

            attributes: {
                create: (data.attributes || []).map(attr => ({
                    attributeDefId: attr.attributeDefId,
                    attributeValueId: attr.attributeValueId
                }))
            }
        }
    });
};