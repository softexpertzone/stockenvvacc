export const ROLES = Object.freeze({
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    PURCHASER: 'PURCHASER',           // Internal staff – buys stock from vendors
    SALESPERSON: 'SALESPERSON',       // Internal staff – sells stock to customers
    PURCHASE_VIEWER: 'PURCHASE_VIEWER',
    SALES_VIEWER: 'SALES_VIEWER',
    PICKER: 'PICKER',
});

export const ROLE_LABELS = Object.freeze({
    [ROLES.SUPER_ADMIN]: 'Super Administrator',
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.PURCHASER]: 'Purchaser',
    [ROLES.SALESPERSON]: 'Salesperson',
    [ROLES.PURCHASE_VIEWER]: 'Purchase Viewer',
    [ROLES.SALES_VIEWER]: 'Sales Viewer',
    [ROLES.PICKER]: 'Picker',
});

export const PERMISSIONS = Object.freeze({
    [ROLES.SUPER_ADMIN]: ['*'],
    [ROLES.ADMIN]: ['*'],

    [ROLES.PURCHASER]: [
        'purchase:read', 'purchase:create', 'purchase:update', 'purchase:delete',
        'grn:read', 'grn:create', 'grn:update',
        'supplier:read', 'supplier:create', 'supplier:update',
        'purchase_return:read', 'purchase_return:create',
        'inventory:read',
        'product:read',
        'dashboard:read',
    ],

    [ROLES.SALESPERSON]: [
        'sales:read', 'sales:create', 'sales:update', 'sales:delete',
        'dispatch:read', 'dispatch:create', 'dispatch:update',
        'customer:read', 'customer:create', 'customer:update',
        'sales_return:read', 'sales_return:create',
        'inventory:read',
        'product:read',
        'dashboard:read',
    ],

    [ROLES.PURCHASE_VIEWER]: [
        'purchase:read',
        'grn:read',
        'supplier:read',
        'purchase_return:read',
        'inventory:read',
        'product:read',
        'dashboard:read',
    ],

    [ROLES.SALES_VIEWER]: [
        'sales:read',
        'dispatch:read',
        'customer:read',
        'sales_return:read',
        'inventory:read',
        'product:read',
        'dashboard:read',
    ],

    [ROLES.PICKER]: [
        'picklist:read',
        'picklist:update',
        'inventory:read',
    ],
});