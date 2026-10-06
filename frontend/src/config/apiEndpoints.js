const isProd = process.env.NODE_ENV === 'production';

// Dynamically use live server IP in production, and localhost during local development
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || (isProd
    ? 'http://87.76.137.85:5000/api'
    : 'http://localhost:5000/api');

export const API_ENDPOINTS = {
    // Auth
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        ME: '/auth/me',
    },

    // Catalog Module
    CATALOG: {
        BRANDS: '/brands',
        CATEGORIES: '/catalog/categories',
        PRODUCTS: '/catalog/products',
    },

    // Inventory Module
    INVENTORY: {
        GODOWNS: '/inventory/godowns',
        STOCK_LEVELS: '/inventory/levels',
        GRN: '/inventory/grn',
    },

    // Partner Module
    PARTNERS: {
        BASE: '/partners',
        REGISTER: '/partners/register',
    },

    // Sales Module
    SALES: {
        CONFIRM: '/sales/confirm',
        NEW: '/sales/new',
        ORDERS: '/sales',
        DETAIL: (id) => `/sales/${id}`,
        PENDING: '/sales/pending-dispatches',
        PARTIAL_PAYMENT: (id) => `/sales/${id}/partial-payment`,
    },

    // Purchase Module
    PURCHASE: {
        NEW: '/purchase',
        PROCESS_GRN: '/purchase/process-grn',
    },

    // Return Reasons
    RETURN_REASONS: {
        LIST:   '/settings/return-reasons',
        CREATE: '/settings/return-reasons',
        UPDATE: (id) => `/settings/return-reasons/${id}`,
        DELETE: (id) => `/settings/return-reasons/${id}`,
    },

    // Accounts Module
    ACCOUNTS: {
        VOUCHERS: '/accounts/vouchers',
        VOUCHER: (id) => `/accounts/vouchers/${id}`,
        POST_VOUCHER: (id) => `/accounts/vouchers/${id}/post`,
        CANCEL_VOUCHER: (id) => `/accounts/vouchers/${id}/cancel`,
        LEDGERS: '/accounts/ledgers',
        GROUPS: '/accounts/groups',
        CHART: '/accounts/chart-of-accounts',
        REPORTS: {
            TRIAL_BALANCE: '/accounts/reports/trial-balance',
            PROFIT_LOSS: '/accounts/reports/profit-loss',
            BALANCE_SHEET: '/accounts/reports/balance-sheet',
            GENERAL_LEDGER: '/accounts/reports/general-ledger',
            VOUCHER_LEDGER: '/accounts/reports/voucher-ledger',
        },
    },
};

/**
 * Helper to get the base URL
 */
export const getBaseApiUrl = () => API_BASE;