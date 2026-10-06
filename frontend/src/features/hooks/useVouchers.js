'use client';

import { useState, useCallback } from 'react';
import { voucherApi } from '../api/voucherApi';

export function useVouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchVouchers = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const res = await voucherApi.getAll(params);
            const data = res.data?.data?.data || res.data?.data || res.data || [];
            setVouchers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch vouchers', err);
            setError(err.response?.data?.message || 'Failed to load vouchers');
            setVouchers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        vouchers,
        loading,
        error,
        fetchVouchers,
    };
}