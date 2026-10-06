import { z } from 'zod';

// Schema for individual attributes
const attributeSchema = z.object({
    attributeDefId: z.string().uuid("Invalid Attribute Definition ID"),
    value: z.string().min(1, "Attribute value cannot be empty") // Fixes the "" issue
});

// Schema for variants
const createVariantSchema = z.object({
    sku: z.string().min(1, "SKU is required"),
    price: z.coerce.number().nonnegative(),
    purchasePrice: z.coerce.number().nonnegative(),
    minStockLevel: z.coerce.number().int().nonnegative(),
    attributes: z.array(attributeSchema).optional()
});

// Exported via named export syntax
export const createProductSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    sku: z.string().min(1, "SKU is required"),
    description: z.string().nullable().optional(),
    categoryId: z.string().uuid("Invalid Category ID").nullable().optional(),
    uomId: z.string().uuid("Invalid UOM ID").nullable().optional(),
    taxId: z.string().uuid("Invalid Tax ID").nullable().optional(),
    brandId: z.string().uuid("Invalid Brand ID").nullable().optional(),
    subBrandId: z.string().uuid("Invalid Sub-Brand ID").nullable().optional(),
    variants: z.array(z.any()).min(1, "At least one variant is required")
});