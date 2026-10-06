const { z } = require('zod');

const processGRNSchema = z.object({
    purchaseOrderId: z.string().uuid("Invalid Purchase Order ID format"),
    grnNumber: z.string().min(3, "GRN Number must be at least 3 characters"),
    items: z.array(
        z.object({
            variantId: z.string().uuid("Invalid Product Variant ID"),
            rackId: z.string().uuid("Rack ID is required"),
            qty: z.number().int().positive("Quantity must be a positive whole number"),
            quantityKg: z.number().nonnegative().optional().default(0)
        })
    ).min(1, "You must receive at least one item")
});

module.exports = { processGRNSchema };