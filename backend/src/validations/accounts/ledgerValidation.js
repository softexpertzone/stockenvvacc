import { z } from 'zod';

export const createLedgerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    groupId: z.string().min(1, 'Account Group is required'),
    ledgerType: z
        .enum(['GENERAL', 'CASH', 'BANK', 'CUSTOMER', 'VENDOR', 'TAX', 'STOCK'])
        .default('GENERAL'),
    openingBalance: z.number().default(0),
    isDebitBalance: z.boolean().default(true),
    description: z.string().nullable().optional(),
});

export const updateLedgerSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    groupId: z.string().min(1).optional(),
    ledgerType: z
        .enum(['GENERAL', 'CASH', 'BANK', 'CUSTOMER', 'VENDOR', 'TAX', 'STOCK'])
        .optional(),
    openingBalance: z.number().optional(),
    isDebitBalance: z.boolean().optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
});