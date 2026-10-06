import prisma from '../lib/prisma.js';
import * as productService from '../services/productService.js';
import { sendSuccess } from '../utils/responseHandler.js';
import { generateSKU } from '../services/skuService.js';

/**
 * Helper: Sanitizes fields.
 * Converts empty strings to null to ensure Foreign Key constraints don't break.
 */
const prepareData = (data) => {
    const sanitize = (val) => (val && typeof val === 'string' && val.trim() !== "" ? val : null);
    return {
        ...data,
        categoryId: sanitize(data.categoryId),
        uomId: sanitize(data.uomId),
        brandId: sanitize(data.brandId),
        taxId: sanitize(data.taxId),
        partnerId: sanitize(data.partnerId),
    };
};

/**
 * Handles the Atomic registration of a product, its variants, and attributes.
 */
export const createProduct = async (req, res, next) => {
    try {
        const payload = prepareData(req.body);
        const { name, categoryId, brandId, variants, description, uomId, taxId, partnerId } = payload;

        // Safety Check: Require at least a name and brand
        if (!name || !brandId) {
            return res.status(400).json({ success: false, message: "Name and Brand are required." });
        }

        // Generate the base SKU (Business Logic)
        const baseSku = await generateSKU(categoryId, brandId);

        // ATOMIC TRANSACTION: Everything here succeeds or nothing happens
        const newProduct = await prisma.$transaction(async (tx) => {

            // 1. Create the Master Product
            const product = await tx.product.create({
                data: {
                    name,
                    sku: baseSku,
                    description: description || null,
                    categoryId,
                    brandId,
                    uomId,
                    taxId,
                    partnerId,
                }
            });

            // 2. Process Variants (if provided)
            if (Array.isArray(variants) && variants.length > 0) {
                for (let i = 0; i < variants.length; i++) {
                    const v = variants[i];

                    // Create the Variant
                    const variant = await tx.productVariant.create({
                        data: {
                            productId: product.id,
                            sku: `${baseSku}-V${i + 1}`, // Automated Variant SKU
                            price: parseFloat(v.price) || 0,
                            purchasePrice: parseFloat(v.purchasePrice) || 0,
                            minStockLevel: parseInt(v.minStockLevel) || 10,
                            name: v.name || `${name} Variant ${i + 1}`,

                            // 3. Nested Attribute Creation (The Join Table)
                            attributes: {
                                create: (Array.isArray(v.attributes) ? v.attributes : []).map(attr => ({
                                    attributeDef: { connect: { id: attr.attributeDefId } },
                                    attributeValue: { connect: { id: attr.attributeValueId } }
                                }))
                            }
                        }
                    });
                }
            }

            return product;
        });

        return sendSuccess(res, newProduct, "Product and variants registered successfully", 201);

    } catch (error) {
        console.error("Product Registration Error:", error);

        // P2002 = Unique Constraint Violation (SKU/Barcode)
        if (error.code === 'P2002') {
            return res.status(409).json({ success: false, message: "A product with this SKU already exists." });
        }

        next(error);
    }
};

/**
 * Retrieves all products with nested variants for the dashboard.
 */
export const getAllProducts = async (req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                productVariants: {
                    include: { attributes: true }
                },
                category: true,
                brand: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return sendSuccess(res, products, "Products retrieved successfully");
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieves all variants with parent product details for dropdowns/select components.
 */

export const getAllVariants = async (req, res, next) => {
    try {
        const variants = await prisma.productVariant.findMany({
            include: {
                product: true,
                attributes: {
                    include: {
                        attributeDef: true,
                        attributeValue: true
                    }
                },
                inventoryBalances: true // 1. Include bin/batch inventory balances
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Compute real-time total stock dynamically across all bins
        const variantsWithLiveStock = variants.map(variant => {
            const realTimeStock = Array.isArray(variant.inventoryBalances)
                ? variant.inventoryBalances.reduce((sum, balance) => sum + (balance.currentCount || 0), 0)
                : 0;

            return {
                ...variant,
                currentStock: realTimeStock // Overwrite/inject real-time sum
            };
        });

        return sendSuccess(res, variantsWithLiveStock, "Product variants retrieved successfully");
    } catch (error) {
        next(error);
    }
};

/**
 * Creates an independent product variant for an existing product.
 */
export const createVariant = async (req, res, next) => {
    try {
        // Implementation logic for adding a variant to an existing ID
        const { productId, sku, ...variantData } = req.body;

        const newVariant = await prisma.productVariant.create({
            data: {
                productId,
                sku,
                ...variantData
            }
        });

        return sendSuccess(res, newVariant, "Variant created successfully", 201);
    } catch (error) {
        next(error);
    }
};