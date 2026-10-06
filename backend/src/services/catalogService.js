import prisma from '../lib/prisma.js';
import { generateSKU } from './skuService.js';

const catalogService = {
    /**
     * TRANSACTIONAL PRODUCT CREATION
     * Generates a unique SKU and maps all fields, including description.
     */
    async createProductWithVariants(data) {
        console.log("👉 [DEBUG] Service Input:", {
            rawDescription: data.description,
            rawType: typeof data.description
        });
        return await prisma.$transaction(async (tx) => {
            // 1. Generate a unique SKU (Ignore the one from frontend to avoid 409 errors)
            const generatedSku = await generateSKU(
                data.categoryId,
                data.brandId,
                data.variants?.[0]?.attributes || []
            );

            // 2. Destructure and prepare data
            const {
                name,
                description, // Frontend must send this key
                categoryId,
                brandId,
                subBrandId,
                uomId,
                taxId,
                maxPurchasePrice,
                minSellingPrice,
                minStockLevel,
                isActive,
                variants
            } = data;

            const safeVariants = Array.isArray(variants) ? variants : [];

            // 3. Create the product
            return await tx.product.create({
                data: {
                    name: name ? name.trim() : "Unnamed Product",
                    sku: generatedSku, // Use the generated unique SKU
                    description: description ? description.trim() : null, // Explicitly mapped
                    categoryId: categoryId || null,
                    brandId: brandId || null,
                    subBrandId: subBrandId || null,
                    uomId: uomId || null,
                    taxId: taxId || null,

                    maxPurchasePrice: parseFloat(maxPurchasePrice || data.costPrice || 0),
                    minSellingPrice: parseFloat(minSellingPrice || data.sellingPrice || 0),
                    minStockLevel: parseInt(minStockLevel || 0),
                    isActive: isActive !== undefined ? isActive : true,

                    productVariants: safeVariants.length > 0 ? {
                        create: await Promise.all(safeVariants.map(async (v) => {
                            const safeAttributes = Array.isArray(v.attributes) ? v.attributes : [];

                            const resolvedAttributes = await Promise.all(safeAttributes.map(async (attr) => {
                                const foundValue = await tx.attributeValue.findFirst({
                                    where: {
                                        attributeDefId: attr.attributeDefId,
                                        value: { equals: attr.value, mode: 'insensitive' }
                                    }
                                });

                                if (!foundValue) throw new Error(`Attribute value "${attr.value}" not found.`);

                                return {
                                    attributeDefId: attr.attributeDefId,
                                    attributeValueId: foundValue.id
                                };
                            }));

                            return {
                                sku: v.sku, // Keep variant SKUs unique or handle generation here if needed
                                price: parseFloat(v.price) || 0,
                                purchasePrice: parseFloat(v.purchasePrice) || 0,
                                minStockLevel: parseInt(v.minStockLevel) || 0,
                                attributes: { create: resolvedAttributes }
                            };
                        }))
                    } : undefined
                },
                include: {
                    productVariants: { include: { attributes: true } }
                }
            });
        });
    },

    async createAttributeDefinition(data) {
        return await prisma.attributeDefinition.create({
            data: { name: data.name.trim(), values: data.values }
        });
    },

    async getAllAttributeDefinitions() {
        return await prisma.attributeDefinition.findMany();
    },

    async createCategory(data) {
        return await this._createEntity(prisma.category, data, 'Category');
    },

    async createBrand(data) {
        const { name, slug, description, parentId, code } = data;
        const sanitizedParentId = (parentId === "" || !parentId) ? null : parentId;

        const globalCodeCheck = await prisma.brand.findFirst({
            where: { code: { equals: code.trim(), mode: 'insensitive' } }
        });

        if (globalCodeCheck) {
            const error = new Error(`The brand code "${code.trim().toUpperCase()}" is already taken.`);
            error.code = 'P2002';
            throw error;
        }

        const localNameCheck = await prisma.brand.findFirst({
            where: {
                name: { equals: name.trim(), mode: 'insensitive' },
                parentId: sanitizedParentId
            }
        });

        if (localNameCheck) {
            const error = new Error('A brand with this name already exists in this tracking level.');
            error.code = 'P2002';
            throw error;
        }

        return await prisma.brand.create({
            data: {
                name: name.trim(),
                description: (description || '').trim(),
                slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
                parentId: sanitizedParentId,
                code: code.trim().toUpperCase()
            }
        });
    },

    async _createEntity(model, { name, description, code }, entityName) {
        const existing = await model.findFirst({
            where: {
                OR: [
                    { name: { equals: name.trim(), mode: 'insensitive' } },
                    { code: { equals: code.trim(), mode: 'insensitive' } }
                ]
            }
        });

        if (existing) {
            const error = new Error(`${entityName} with this name or code already exists`);
            error.code = 'P2002';
            throw error;
        }

        return await model.create({
            data: {
                name: name.trim(),
                description: (description || '').trim(),
                code: code.trim().toUpperCase()
            }
        });
    },

    async getAllCategories() { return await prisma.category.findMany({ orderBy: { name: 'asc' } }); },
    async getAllBrands() { return await prisma.brand.findMany({ orderBy: { name: 'asc' } }); },
    async getAllSuppliers() { return await prisma.partner.findMany({ where: { type: 'VENDOR' }, orderBy: { companyName: 'asc' } }); },

    async createVariant(data) {
        return await prisma.productVariant.create({
            data: {
                productId: data.productId,
                sku: data.sku,
                price: parseFloat(data.price) || 0,
                purchasePrice: parseFloat(data.purchasePrice) || 0,
                minStockLevel: parseInt(data.minStockLevel) || 0
            }
        });
    },

    async checkConnection() {
        try { await prisma.$queryRaw`SELECT 1`; return { connected: true }; }
        catch (error) { return { connected: false, error: error.message }; }
    }
};

export default catalogService;