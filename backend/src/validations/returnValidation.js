import { z } from 'zod';

// Helper: converts empty string / undefined to null
const emptyToNull = z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.string().uuid().optional().nullable()
);

// Helper for required UUID
const requiredUuid = (message) =>
    z.preprocess(
        (val) => (val === '' || val === undefined ? null : val),
        z.string({ required_error: message }).uuid({ message })
    );

// Allowed dispositions (must match returnService.js)
const DISPOSITION_ENUM = z.enum([
    'RETURN_TO_STOCK',
    'RESTOCK',
    'QUARANTINE',
    'SCRAP',
    'REPAIR',
]);

// Allowed condition grades (aligned with service inference logic)
const CONDITION_GRADE_ENUM = z.enum([
    'GOOD',
    'OPEN_BOX',
    'LIKE_NEW',
    'NEW',
    'DAMAGED',
    'DEFECTIVE',
    'BROKEN',
    'EXPIRED',
    'FAULTY',
    'A', // legacy support
    'B',
    'C',
]);

// ====================== PURCHASE RETURN ======================
export const createPurchaseReturnSchema = z.object({
    purchaseOrderId: emptyToNull,
    grnId: emptyToNull,
    partnerId: requiredUuid('Invalid Partner (Vendor) ID'),
    notes: z.string().optional().nullable(),
    refundAmount: z.coerce.number().optional().nullable(),

    items: z
        .array(
            z.object({
                productVariantId: requiredUuid('Invalid Product Variant ID'),
                binId: requiredUuid('Bin / storage location is required'), // now strict
                batchId: emptyToNull,
                quantityCount: z.coerce
                    .number()
                    .int()
                    .positive('Return quantity must be greater than 0'),
                quantityKg: z.coerce.number().optional().default(0),
                reasonId: z.string().min(1, 'Reason is required'), // UUID or code
                unitCost: z.coerce.number().optional().nullable(),
                notes: z.string().optional().nullable(),
                originalGrnItemId: emptyToNull,
            })
        )
        .min(1, 'You must return at least one item'),
});

// ====================== CUSTOMER RETURN ======================
export const createCustomerReturnSchema = z
    .object({
        salesOrderId: emptyToNull,
        partnerId: requiredUuid('Invalid Partner (Customer) ID'),
        notes: z.string().optional().nullable(),

        // Header-level disposition is optional (line-level is preferred)
        disposition: DISPOSITION_ENUM.optional().nullable(),

        items: z
            .array(
                z.object({
                    productVariantId: requiredUuid('Invalid Product Variant ID'),
                    binId: requiredUuid('Bin / storage location is required'), // now strict
                    batchId: emptyToNull,
                    quantityCount: z.coerce
                        .number()
                        .int()
                        .positive('Return quantity must be greater than 0'),
                    quantityKg: z.coerce.number().optional().default(0),
                    reasonId: z.string().min(1, 'Reason is required'), // UUID or code
                    conditionGrade: CONDITION_GRADE_ENUM.optional().nullable(),
                    disposition: DISPOSITION_ENUM.optional().nullable(),
                    notes: z.string().optional().nullable(),
                    unitCost: z.coerce.number().optional().nullable(),
                    originalSalesOrderItemId: emptyToNull,
                })
            )
            .min(1, 'You must return at least one item'),
    })
    // Extra business rule: notes required when disposition is not pure restock
    .superRefine((data, ctx) => {
        data.items.forEach((item, index) => {
            const disp = (item.disposition || data.disposition || '').toUpperCase();

            if (['QUARANTINE', 'SCRAP', 'REPAIR'].includes(disp)) {
                if (!item.notes || !item.notes.trim()) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Notes are required when disposition is ${disp}`,
                        path: ['items', index, 'notes'],
                    });
                }
            }
        });
    });