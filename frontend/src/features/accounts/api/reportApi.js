import apiClient from '@/lib/apiClient';

const BASE = '/api/accounts/reports';

export const reportApi = {
    trialBalance: (params = {}) => apiClient.get(`${BASE}/trial-balance`, { params }),
    profitLoss: (params = {}) => apiClient.get(`${BASE}/profit-loss`, { params }),
    balanceSheet: (params = {}) => apiClient.get(`${BASE}/balance-sheet`, { params }),
    generalLedger: (params = {}) => apiClient.get(`${BASE}/general-ledger`, { params }),
    voucherLedger: (params = {}) => apiClient.get(`${BASE}/voucher-ledger`, { params }),
};