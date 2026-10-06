import { z } from 'zod';

/**
 * DispatchSchema
 * Validation contract for the Sales Order Dispatch process.
 * .strict() ensures no unexpected fields are passed (prevents parameter pollution).
 */
export const DispatchSchema = z.object({
    salesOrderId: z.string({
        required_error: "Sales Order ID is required"
    }).uuid("Invalid Sales Order ID format"),

    // Optional field for audit trail or warehouse notes
    notes: z.string()
        .max(500, "Notes cannot exceed 500 characters")
        .optional(),

    // Example of an industry-standard flag for specific workflows
    isUrgent: z.boolean().default(false).optional(),

    // Validating the operator/user if you pass it from the request body
    dispatchedBy: z.string().uuid().optional(),

}).strict();