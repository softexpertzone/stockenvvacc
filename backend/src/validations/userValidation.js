import { body, query } from 'express-validator';
import { ROLES } from '../config/roles.js';
import {
    checkPermission,
    requireRoles,
    blockViewersOnWrite,
} from '../middleware/permissionMiddleware.js';

export const registerUserRules = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
        .matches(/[a-z]/).withMessage('Must contain lowercase letter')
        .matches(/[0-9]/).withMessage('Must contain a number'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone')
        .optional({ values: 'null' })
        .custom((value) => {
            if (value === null || value === undefined || value === '') return true;
            return /^[\d\s+\-()]{7,20}$/.test(value);
        })
        .withMessage('Invalid phone number'),
    body('role')
        .optional()
        .isIn(Object.values(ROLES))
        .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
];

export const updateUserRules = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone')
        .optional({ values: 'null' })          // allow null
        .custom((value) => {
            if (value === null || value === undefined || value === '') return true;
            // simple phone check (you can make it stricter later)
            return /^[\d\s+\-()]{7,20}$/.test(value);
        })
        .withMessage('Invalid phone number'),
    body('role').optional().isIn(Object.values(ROLES)),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    body('allowedModules').optional().isArray(),
];

export const changePasswordRules = [
    body('currentPassword').notEmpty(),
    body('newPassword')
        .isLength({ min: 8 })
        .matches(/[A-Z]/)
        .matches(/[a-z]/)
        .matches(/[0-9]/),
];

export const listUsersRules = [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(Object.values(ROLES)),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    query('search').optional().isString(),
];