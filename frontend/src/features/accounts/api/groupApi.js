import apiClient from '@/lib/apiClient';

const BASE = '/api/accounts/groups';

export const groupApi = {
    getAll: (params = {}) => apiClient.get(BASE, { params }),
    getTree: () => apiClient.get(`${BASE}/tree`),
    getById: (id) => apiClient.get(`${BASE}/${id}`),
    create: (data) => apiClient.post(BASE, data),
    update: (id, data) => apiClient.put(`${BASE}/${id}`, data),
    delete: (id) => apiClient.delete(`${BASE}/${id}`),
};