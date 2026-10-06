import { z } from 'zod';

const voucherEntrySchema = z
    .object({
        ledgerId: z
            .string({ required_error: 'Ledger is required' })
            .uuid({ message: 'Invalid ledger ID' }),
        debit: z.coerce.number().min(0).default(0),
        credit: z.coerce.number().min(0).default(0),
        notes: z.string().max(500).optional().nullable().or(z.literal('')),
    })
    .superRefine((value, ctx) => {
        const debit = Number(value.debit || 0);
        const credit = Number(value.credit || 0);

        if (debit > 0 && credit > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'An entry cannot have both Debit and Credit',
            });
        }
        if (debit === 0 && credit === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'An entry must have either Debit or Credit amount',
            });
        }
    });
export const createVoucherSchema = z
    .object({
        voucherType: z.enum(['RECEIPT', 'PAYMENT', 'CONTRA', 'JOURNAL'], {
            required_error: 'Voucher type is required',
            invalid_type_error: 'Voucher type must be RECEIPT, PAYMENT, CONTRA or JOURNAL',
        }),
        voucherDate: z.union([z.string(), z.date()], {
            required_error: 'Voucher date is required',
            invalid_type_error: 'Invalid date format',
        }),
        narration: z.string().max(1000).optional().nullable().or(z.literal('')),
        financialYear: z.string().max(20).optional().nullable().or(z.literal('')),
        referenceType: z.string().max(50).optional().nullable().or(z.literal('')),
        referenceId: z.string().uuid().optional().nullable(),

        // Added so they are not stripped by Zod
        partnerId: z.string().uuid().optional().nullable(),
        purchaseOrderId: z.string().uuid().optional().nullable(),

        entries: z
            .array(voucherEntrySchema)
            .min(2, { message: 'Voucher must have at least 2 entries' }),
    })
    .superRefine((value, ctx) => {
        const totalDebit = value.entries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
        const totalCredit = value.entries.reduce((sum, e) => sum + Number(e.credit || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Total Debit (${totalDebit}) must equal Total Credit (${totalCredit})`,
            });
        }
    });

export const updateVoucherSchema = z
    .object({
        voucherDate: z.union([z.string(), z.date()]).optional(),
        narration: z.string().max(1000).optional().nullable().or(z.literal('')),
        financialYear: z.string().max(20).optional().nullable().or(z.literal('')),
        entries: z.array(voucherEntrySchema).min(2).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required for update',
    });

export const cancelVoucherSchema = z.object({
    reason: z.string().max(500).optional().nullable().or(z.literal('')),
});