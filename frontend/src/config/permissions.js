// 1. Define granular system permissions
export const PERMISSIONS = {
    // Dashboards
    DASHBOARD_VIEW: 'dashboard.view',

    // Warehouse & Operations
    WAREHOUSE_SETUP: 'warehouse.setup',
    WAREHOUSE_OPS: 'warehouse.ops',
    INVENTORY_TRANSFER: 'inventory.transfer',
    INVENTORY_VIEW: 'inventory.view',

    // Procurement
    PO_VIEW: 'po.view',
    PO_CREATE: 'po.create',
    GRN_PROCESS: 'grn.process',

    // Product Catalog
    CATALOG_VIEW: 'catalog.view',
    CATALOG_MANAGE: 'catalog.manage',

    // System Settings
    SYSTEM_SETTINGS: 'system.settings',

    // Sales & Partners
    SALES_VIEW: 'sales.view',
    SALES_CREATE: 'sales.create',
    PARTNERS_MANAGE: 'partners.manage',

    // Returns
    RETURNS_VIEW: 'returns.view',
    RETURNS_CREATE: 'returns.create',

    // ========== ACCOUNTS MODULE ==========
    ACCOUNTS_VIEW: 'accounts.view',
    ACCOUNTS_CREATE: 'accounts.create',
    ACCOUNTS_MANAGE: 'accounts.manage',
    ACCOUNTS_REPORTS: 'accounts.reports',
};

// 2. Role → Permission Mapping
export const ROLE_PERMISSIONS = {
    // Full access
    SUPER_ADMIN: ['*'],
    ADMIN: ['*'],

    // Manager
    MANAGER: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.WAREHOUSE_SETUP,
        PERMISSIONS.WAREHOUSE_OPS,
        PERMISSIONS.INVENTORY_TRANSFER,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.PO_VIEW,
        PERMISSIONS.PO_CREATE,
        PERMISSIONS.GRN_PROCESS,
        PERMISSIONS.CATALOG_VIEW,
        PERMISSIONS.CATALOG_MANAGE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.PARTNERS_MANAGE,
        PERMISSIONS.RETURNS_VIEW,
        PERMISSIONS.RETURNS_CREATE,
        PERMISSIONS.SYSTEM_SETTINGS,
        // Accounts
        PERMISSIONS.ACCOUNTS_VIEW,
        PERMISSIONS.ACCOUNTS_CREATE,
        PERMISSIONS.ACCOUNTS_MANAGE,
        PERMISSIONS.ACCOUNTS_REPORTS,
    ],

    // ========== PURCHASE SIDE ==========
    PURCHASER: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PO_VIEW,
        PERMISSIONS.PO_CREATE,
        PERMISSIONS.GRN_PROCESS,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.CATALOG_VIEW,
        PERMISSIONS.PARTNERS_MANAGE,
        PERMISSIONS.RETURNS_VIEW,
        PERMISSIONS.RETURNS_CREATE,
    ],

    PURCHASE_VIEWER: [
        PERMISSIONS.PO_VIEW,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.CATALOG_VIEW,
        PERMISSIONS.RETURNS_VIEW,
    ],

    // ========== SALES SIDE ==========
    SALESPERSON: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.CATALOG_VIEW,
        PERMISSIONS.PARTNERS_MANAGE,
        PERMISSIONS.RETURNS_VIEW,
        PERMISSIONS.RETURNS_CREATE,
    ],

    SALES_VIEWER: [
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.CATALOG_VIEW,
        PERMISSIONS.RETURNS_VIEW,
    ],

    // ========== WAREHOUSE / STOCK WORKERS ==========
    PICKER: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.WAREHOUSE_OPS,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_TRANSFER,
    ],

    STAFF: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.WAREHOUSE_OPS,
        PERMISSIONS.INVENTORY_TRANSFER,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.GRN_PROCESS,
        PERMISSIONS.CATALOG_VIEW,
        PERMISSIONS.RETURNS_VIEW,
    ],

    WAREHOUSE: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.WAREHOUSE_OPS,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_TRANSFER,
        PERMISSIONS.GRN_PROCESS,
        PERMISSIONS.CATALOG_VIEW,
        PERMISSIONS.RETURNS_VIEW,
    ],
};

// 3. Permission check
export const hasPermission = (userRole, requiredPermissions = []) => {
    if (!userRole) return false;

    const normalizedRole = String(userRole).toUpperCase();
    const userPermissions = ROLE_PERMISSIONS[normalizedRole] || [];

    // Admin / Super Admin bypass
    if (userPermissions.includes('*')) return true;

    // No permissions required = public
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    // Role needs at least ONE of the required permissions
    return requiredPermissions.some((perm) => userPermissions.includes(perm));
};