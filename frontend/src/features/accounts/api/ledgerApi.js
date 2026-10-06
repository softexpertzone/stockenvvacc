import apiClient from '@/lib/apiClient';

const BASE = '/api/accounts/ledgers';

export const ledgerApi = {
    getAll: (params = {}) => apiClient.get(BASE, { params }),
    getById: (id) => apiClient.get(`${BASE}/${id}`),
    getBalance: (id) => apiClient.get(`${BASE}/${id}/balance`),
    create: (data) => apiClient.post(BASE, data),
    update: (id, data) => apiClient.put(`${BASE}/${id}`, data),
    delete: (id) => apiClient.delete(`${BASE}/${id}`),
};