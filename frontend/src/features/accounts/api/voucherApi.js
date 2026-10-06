import api from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/config/apiEndpoints';

export const voucherApi = {
    async getAll(params = {}) {
        const res = await api.get(API_ENDPOINTS.ACCOUNTS.VOUCHERS, { params });
        return res;
    },

    async getById(id) {
        const res = await api.get(API_ENDPOINTS.ACCOUNTS.VOUCHER(id));
        return res;
    },

    async create(payload) {
        const res = await api.post(API_ENDPOINTS.ACCOUNTS.VOUCHERS, payload);
        return res;
    },

    async update(id, payload) {
        const res = await api.put(API_ENDPOINTS.ACCOUNTS.VOUCHER(id), payload);
        return res;
    },

    async post(id) {
        const res = await api.post(API_ENDPOINTS.ACCOUNTS.POST_VOUCHER(id));
        return res;
    },

    async cancel(id, reason) {
        const res = await api.post(API_ENDPOINTS.ACCOUNTS.CANCEL_VOUCHER(id), { reason });
        return res;
    },

    async delete(id) {
        const res = await api.delete(API_ENDPOINTS.ACCOUNTS.VOUCHER(id));
        return res;
    },
};

export const ledgerApi = {
    async getAll(params = {}) {
        const res = await api.get(API_ENDPOINTS.ACCOUNTS.LEDGERS, { params });
        return res;
    },

    async getById(id) {
        const res = await api.get(`${API_ENDPOINTS.ACCOUNTS.LEDGERS}/${id}`);
        return res;
    },
};

export const accountsReportApi = {
    async trialBalance(params = {}) {
        const res = await api.get(API_ENDPOINTS.ACCOUNTS.REPORTS.TRIAL_BALANCE, { params });
        return res;
    },

    async profitLoss(params = {}) {
        const res = await api.get(API_ENDPOINTS.ACCOUNTS.REPORTS.PROFIT_LOSS, { params });
        return res;
    },

    async balanceSheet(params = {}) {
        const res = await api.get(API_ENDPOINTS.ACCOUNTS.REPORTS.BALANCE_SHEET, { params });
        return res;
    },

    async generalLedger(params = {}) {
        const res = await api.get(API_ENDPOINTS.ACCOUNTS.REPORTS.GENERAL_LEDGER, { params });
        return res;
    },

    async voucherLedger(params = {}) {
        const res = await api.get(API_ENDPOINTS.ACCOUNTS.REPORTS.VOUCHER_LEDGER, { params });
        return res;
    },
};