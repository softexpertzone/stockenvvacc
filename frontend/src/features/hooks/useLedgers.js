'use client';

import { useState, useCallback } from 'react';
import { ledgerApi } from '../api/ledgerApi';

export function useLedgers() {
    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({});

    const fetchLedgers = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const res = await ledgerApi.getAll(params);
            // Backend: { success, message, data: { data: [...], pagination } }
            const payload = res?.data?.data ?? {};
            const list = Array.isArray(payload.data) ? payload.data : [];
            setLedgers(list);
            setPagination(payload.pagination || {});
        } catch (err) {
            console.error(err);
            setLedgers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        ledgers,
        loading,
        pagination,
        fetchLedgers,
    };
}