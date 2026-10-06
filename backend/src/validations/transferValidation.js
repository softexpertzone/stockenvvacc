// C:\stockinventory\backend\src\validations\transferValidation.js
const { z } = require('zod');

// 1. Single Item Transfer Schema
const transferSchema = z.object({
    productVariantId: z.string().uuid("Invalid Product Variant"),
    sourceRackId: z.string().uuid("Source rack is required"),
    destinationRackId: z.string().uuid("Destination rack is required"),
    quantityCount: z.number().int().positive("Quantity must be a positive integer"),
    quantityKg: z.number().nonnegative().default(0),
    notes: z.string().optional()
}).refine((data) => data.sourceRackId !== data.destinationRackId, {
    message: "Source and destination racks must be different.",
    path: ["destinationRackId"],
});

// 2. Simple Array Transfer Schema
const internalTransferSchema = z.object({
    items: z.array(z.object({
        variantId: z.string().uuid(),
        sourceRackId: z.string().uuid(),
        destinationRackId: z.string().uuid(),
        qty: z.preprocess((val) => parseInt(val, 10), z.number().positive()),
    })).min(1, "At least one item is required for transfer"),
    notes: z.string().optional(),
});

// 3. Robust Array Transfer Schema with validation rules
const processTransferSchema = z.object({
    notes: z.string().optional(),
    items: z.array(
        z.object({
            variantId: z.string().uuid("Invalid Product Variant ID"),
            sourceRackId: z.string().uuid("Source Rack ID is required"),
            destinationRackId: z.string().uuid("Destination Rack ID is required"),
            qty: z.preprocess((val) => parseInt(val, 10), z.number().int().positive("Transfer quantity must be greater than 0"))
        }).refine(data => data.sourceRackId !== data.destinationRackId, {
            message: "Source and Destination racks cannot be the same.",
            path: ["destinationRackId"]
        })
    ).min(1, "You must transfer at least one item")
});

// Combine ALL exports into a single statement at the bottom
module.exports = {
    transferSchema,
    internalTransferSchema,
    processTransferSchema
};