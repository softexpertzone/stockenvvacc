export const MODULES = {
    DASHBOARD: 'dashboard',
    WAREHOUSE: 'warehouse',
    INVENTORY: 'inventory',
    PROCUREMENT: 'purchase',
    SALES: 'sales',
    CATALOG: 'catalog',
    ACCOUNTS: 'accounts',
    SYSTEM: 'system',
};

export const ALL_MODULES = Object.values(MODULES);

export const SECTION_TO_MODULE = {
    'DASHBOARD': MODULES.DASHBOARD,
    'WAREHOUSE SETUP': MODULES.WAREHOUSE,
    'WAREHOUSE OPS': MODULES.WAREHOUSE,
    'PROCUREMENT': MODULES.PROCUREMENT,
    'SALES & PARTNERS': MODULES.SALES,
    'CATALOG': MODULES.CATALOG,
    'ACCOUNTS': MODULES.ACCOUNTS,
    'SYSTEM SETTINGS': MODULES.SYSTEM,
};