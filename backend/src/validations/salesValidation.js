import { z } from 'zod';

export const processSalesSchema = z.object({
    invoiceNumber: z.string().min(3, "Invoice Number is required").optional().or(z.string()),
    partnerId: z.string().uuid("Invalid Partner ID").nullable().optional(),
    customerId: z.string().uuid("Invalid Customer ID").nullable().optional(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT', 'CHEQUE']),
    totalAmount: z.number().nonnegative("Total amount cannot be negative"),
    receivedAmount: z.number().nonnegative("Received amount cannot be negative"),

    // Renamed to 'items' to match the service layer payload mapping
    items: z.array(
        z.object({
            productVariantId: z.string().uuid("Invalid Product Variant ID"),
            // rackId / binId is entirely omitted here because the WMS engine determines the location automatically
            quantityCount: z.number().int().positive("Sales quantity must be a positive number"),
            unitPrice: z.number().nonnegative("Unit price cannot be negative")
        })
    ).min(1, "A sales order must contain at least one item")
});