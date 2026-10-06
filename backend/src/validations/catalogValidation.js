const { z } = require('zod');

// This schema defines exactly what the frontend is sending:
// { attributeDefId: "uuid", value: "someString" }
const attributeSchema = z.object({
    attributeDefId: z.string().uuid("Invalid Attribute Definition ID"),
    value: z.string().min(1, "Attribute value is required") // Ensures value isn't empty!
});

const createVariantSchema = z.object({
    sku: z.string().min(1, "SKU is required"),
    price: z.coerce.number().nonnegative(),
    purchasePrice: z.coerce.number().nonnegative(),
    minStockLevel: z.coerce.number().int().nonnegative(),
    attributes: z.array(attributeSchema).optional()
});

const createProductSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    sku: z.string().min(1, "SKU is required"),
    categoryId: z.string().uuid("Invalid Category ID"),
    uomId: z.string().uuid("Invalid UOM ID"),
    taxId: z.string().uuid("Invalid Tax ID"),
    brandId: z.string().uuid("Invalid Brand ID"),
    subBrandId: z.string().uuid().optional().nullable(),
    variants: z.array(createVariantSchema).min(1, "At least one variant is required")
});

module.exports = { createProductSchema };