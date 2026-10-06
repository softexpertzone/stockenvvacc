const { z } = require('zod');

const stockAdjustmentSchema = z.object({
    productVariantId: z.string().uuid(),
    rackId: z.string().uuid(),
    physicalCount: z.number().int().nonnegative(),
    reason: z.enum(['COUNT_ERROR', 'DAMAGED', 'LOST', 'THEFT', 'OTHER']),
    notes: z.string().optional()
});

module.exports = { stockAdjustmentSchema };