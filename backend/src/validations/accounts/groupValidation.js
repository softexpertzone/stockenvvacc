import { z } from 'zod';

export const createGroupSchema = z.object({
    name: z
        .string({ required_error: 'Group name is required' })
        .trim()
        .min(2, 'Group name must be at least 2 characters')
        .max(100),

    code: z
        .string({ required_error: 'Group code is required' })
        .trim()
        .toUpperCase()
        .min(2, 'Group code must be at least 2 characters')
        .max(20),

    nature: z.enum(['ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES', 'EQUITY'], {
        errorMap: () => ({
            message: 'Nature must be ASSETS, LIABILITIES, INCOME, EXPENSES or EQUITY',
        }),
    }),

    type: z.enum(['PRIMARY', 'SECONDARY']).default('PRIMARY'),

    parentId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .or(z.literal(null)),

    description: z
        .string()
        .max(500)
        .nullable()
        .optional()
        .or(z.literal('')),

    sortOrder: z.number().int().min(0).default(0),
});

export const updateGroupSchema = z
    .object({
        name: z.string().trim().min(2).max(100).optional(),
        code: z.string().trim().toUpperCase().min(2).max(20).optional(),
        nature: z
            .enum(['ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES', 'EQUITY'])
            .optional(),
        type: z.enum(['PRIMARY', 'SECONDARY']).optional(),
        parentId: z.string().uuid().nullable().optional(),
        description: z.string().max(500).nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().min(0).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });