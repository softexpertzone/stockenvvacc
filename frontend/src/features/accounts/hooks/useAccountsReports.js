'use client';

import { useState } from 'react';
import { reportApi } from '../api/reportApi';

export function useAccountsReports() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const fetchReport = async (type, params = {}) => {
        setLoading(true);
        setError(null);
        try {
            let res;
            switch (type) {
                case 'trial-balance':
                    res = await reportApi.trialBalance(params);
                    break;
                case 'profit-loss':
                    res = await reportApi.profitLoss(params);
                    break;
                case 'balance-sheet':
                    res = await reportApi.balanceSheet(params);
                    break;
                case 'general-ledger':
                    res = await reportApi.generalLedger(params);
                    break;
                case 'voucher-ledger':
                    res = await reportApi.voucherLedger(params);
                    break;
                default:
                    throw new Error('Invalid report type');
            }
            setData(res.data?.data || res.data);
            return res.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load report');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, fetchReport };
}