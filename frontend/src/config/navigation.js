import { PERMISSIONS } from './permissions';

export const SIDEBAR_CONFIG = [
    {
        title: 'DASHBOARD',
        links: [
            {
                href: '/dashboard',
                label: 'Overview',
                permissions: [PERMISSIONS.DASHBOARD_VIEW],
            },
        ],
    },
    {
        title: 'WAREHOUSE SETUP',
        links: [
            {
                href: '/warehouse/setup',
                label: 'Unified Layout Manager',
                permissions: [PERMISSIONS.WAREHOUSE_SETUP],
            },
            {
                href: '/warehouse/layout',
                label: 'Visual Map (Live)',
                permissions: [PERMISSIONS.WAREHOUSE_OPS, PERMISSIONS.WAREHOUSE_SETUP],
            },
        ],
    },
    {
        title: 'WAREHOUSE OPS',
        links: [
            {
                href: '/warehouse/stock',
                label: 'Stock Balances',
                permissions: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.WAREHOUSE_OPS],
            },
            {
                href: '/inventory/ledger',
                label: 'Stock Ledger',
                permissions: [PERMISSIONS.WAREHOUSE_OPS],
            },
            {
                href: '/inventory/transfer',
                label: 'Internal Transfer',
                permissions: [PERMISSIONS.INVENTORY_TRANSFER],
            },
        ],
    },
    {
        title: 'PROCUREMENT',
        links: [
            {
                href: '/purchase/new',
                label: 'New PO',
                permissions: [PERMISSIONS.PO_CREATE],
            },
            {
                href: '/purchase/orders',
                label: 'Purchase Orders List',
                permissions: [PERMISSIONS.PO_VIEW],
            },
            {
                href: '/warehouse/putaway',
                label: 'Smart Putaway',
                permissions: [PERMISSIONS.WAREHOUSE_OPS],
            },
            {
                href: '/inventory/grn',
                label: 'GRN Processing',
                permissions: [PERMISSIONS.GRN_PROCESS],
            },
            {
                href: '/purchase/returns',
                label: 'Purchase Returns',
                permissions: [PERMISSIONS.PO_VIEW, PERMISSIONS.PO_CREATE],
            },
            {
                href: '/purchase/returns/new',
                label: 'New Purchase Return',
                permissions: [PERMISSIONS.PO_CREATE],
            },
        ],
    },
    {
        title: 'SALES & PARTNERS',
        links: [
            {
                href: '/checkout',
                label: 'Checkout / Sales',
                permissions: [PERMISSIONS.SALES_CREATE],
            },
            {
                href: '/sales/orders',
                label: 'Sales Orders List',
                permissions: [PERMISSIONS.SALES_VIEW],
            },
            {
                href: '/sales/returns',
                label: 'Sales Returns',
                permissions: [PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE],
            },
            {
                href: '/sales/returns/new',
                label: 'New Sales Return',
                permissions: [PERMISSIONS.SALES_CREATE],
            },
            {
                href: '/partners/directory?type=VENDOR',
                label: 'Supplier Directory',
                permissions: [PERMISSIONS.PO_VIEW],
            },
            {
                href: '/partners/directory?type=BUYER',
                label: 'Buyer Directory',
                permissions: [PERMISSIONS.SALES_VIEW],
            },
        ],
    },
    {
        title: 'CATALOG',
        links: [
            {
                href: '/catalog',
                label: 'Categories',
                permissions: [PERMISSIONS.CATALOG_MANAGE],
            },
            {
                href: '/catalog/brand',
                label: 'Brands / Sub-Brands',
                permissions: [PERMISSIONS.CATALOG_MANAGE],
            },
            {
                href: '/catalog/attributes',
                label: 'Product Attributes',
                permissions: [PERMISSIONS.CATALOG_MANAGE],
            },
            {
                href: '/catalog/product',
                label: 'Register Product',
                permissions: [PERMISSIONS.CATALOG_MANAGE],
            },
        ],
    },
    // ========== ACCOUNTS MODULE ==========
    {
        title: 'ACCOUNTS',
        links: [
            {
                href: '/accounts',
                label: 'Accounts Overview',
                permissions: [PERMISSIONS.ACCOUNTS_VIEW],
            },
            {
                href: '/accounts/vouchers/receipt',
                label: 'Receipt Voucher',
                permissions: [PERMISSIONS.ACCOUNTS_CREATE],
            },
            {
                href: '/accounts/vouchers/customer-receipt',
                label: 'Customer Receipt (Sales)',
                permissions: [PERMISSIONS.ACCOUNTS_CREATE],
            },
            {
                href: '/accounts/vouchers/payment',
                label: 'Payment Voucher',
                permissions: [PERMISSIONS.ACCOUNTS_CREATE],
            },
            {
                href: '/accounts/vouchers/contra',
                label: 'Contra Voucher',
                permissions: [PERMISSIONS.ACCOUNTS_CREATE],
            },
            {
                href: '/accounts/vouchers/journal',
                label: 'Journal Voucher',
                permissions: [PERMISSIONS.ACCOUNTS_CREATE],
            },
            {
                href: '/accounts/vouchers',
                label: 'Voucher Register',
                permissions: [PERMISSIONS.ACCOUNTS_VIEW],
            },
            {
                href: '/accounts/masters/groups',
                label: 'Account Groups',
                permissions: [PERMISSIONS.ACCOUNTS_MANAGE],
            },
            {
                href: '/accounts/masters/ledgers',
                label: 'Ledgers',
                permissions: [PERMISSIONS.ACCOUNTS_MANAGE],
            },
            {
                href: '/accounts/masters/chart-of-accounts',
                label: 'Chart of Accounts',
                permissions: [PERMISSIONS.ACCOUNTS_MANAGE],
            },
            {
                href: '/accounts/reports/trial-balance',
                label: 'Trial Balance',
                permissions: [PERMISSIONS.ACCOUNTS_REPORTS],
            },
            {
                href: '/accounts/reports/profit-loss',
                label: 'Profit & Loss',
                permissions: [PERMISSIONS.ACCOUNTS_REPORTS],
            },
            {
                href: '/accounts/reports/balance-sheet',
                label: 'Balance Sheet',
                permissions: [PERMISSIONS.ACCOUNTS_REPORTS],
            },
            {
                href: '/accounts/reports/cash-flow',
                label: 'Cash Flow',
                permissions: [PERMISSIONS.ACCOUNTS_REPORTS],
            },
            {
                href: '/accounts/reports/general-ledger',
                label: 'General Ledger',
                permissions: [PERMISSIONS.ACCOUNTS_REPORTS],
            },
            {
                href: '/accounts/reports/voucher-ledger',
                label: 'Voucher Ledger',
                permissions: [PERMISSIONS.ACCOUNTS_REPORTS],
            },
        ],
    },
    {
        title: 'SYSTEM SETTINGS',
        links: [
            {
                href: '/settings/modules',
                label: 'Module Settings',
                permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
                href: '/settings/users',
                label: 'User Management',
                permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
                href: '/settings/uoms',
                label: 'Units of Measure',
                permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
                href: '/settings/taxes',
                label: 'Tax Configuration',
                permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
                href: '/settings/backup',
                label: 'Database Backup',
                permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
                href: '/settings/return-reasons',
                label: 'Return Reasons',
                permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
        ],
    },
];