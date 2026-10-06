'use client';

import { useState, useCallback } from 'react';
import { accountsReportApi } from '../api/voucherApi';

export function useAccountsReports() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchReport = useCallback(async (type, params = {}) => {
        setLoading(true);
        setError(null);
        try {
            let res;
            switch (type) {
                case 'trial-balance':
                    res = await accountsReportApi.trialBalance(params);
                    break;
                case 'profit-loss':
                    res = await accountsReportApi.profitLoss(params);
                    break;
                case 'balance-sheet':
                    res = await accountsReportApi.balanceSheet(params);
                    break;
                case 'general-ledger':
                    res = await accountsReportApi.generalLedger(params);
                    break;
                case 'voucher-ledger':
                    res = await accountsReportApi.voucherLedger(params);
                    break;
                default:
                    throw new Error(`Unknown report type: ${type}`);
            }
            const payload = res.data?.data || res.data;
            setData(payload);
            return payload;
        } catch (err) {
            console.error('Failed to fetch report', err);
            setError(err.response?.data?.message || 'Failed to load report');
            setData(null);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        data,
        loading,
        error,
        fetchReport,
    };
}