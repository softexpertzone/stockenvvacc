'use client';

import { useState, useCallback } from 'react';
import { voucherApi } from '../api/voucherApi';

export function useVouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 });

    const fetchVouchers = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const res = await voucherApi.getAll(params);
            // Backend shape: { success, message, data: { data: [...], pagination } }
            const payload = res?.data?.data ?? {};
            const list = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []);
            setVouchers(list);
            setPagination(payload.pagination || { total: 0, page: 1, limit: 20 });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch vouchers');
            setVouchers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const createVoucher = async (data) => {
        const res = await voucherApi.create(data);
        return res.data;
    };

    const postVoucher = async (id) => {
        const res = await voucherApi.post(id);
        return res.data;
    };

    const cancelVoucher = async (id, reason) => {
        const res = await voucherApi.cancel(id, reason);
        return res.data;
    };

    return {
        vouchers,
        loading,
        error,
        pagination,
        fetchVouchers,
        createVoucher,
        postVoucher,
        cancelVoucher,
    };
}