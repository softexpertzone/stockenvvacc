// src/schemas/adjustment.schema.js
import { z } from 'zod';

export const AdjustmentSchema = z.object({
    binId: z.string().uuid(),
    productVariantId: z.string().uuid(),
    batchId: z.string().uuid().optional(),
    quantity: z.number().int().refine(n => n !== 0, "Quantity cannot be zero"),
    weight: z.number().positive(),
    reason: z.enum(['DAMAGE', 'EXPIRED', 'FOUND', 'COUNT_CORRECTION', 'PILFERAGE'], {
        errorMap: () => ({ message: "Invalid adjustment reason code" })
    }),
    notes: z.string().max(255).optional()
});