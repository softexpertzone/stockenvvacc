'use client';

import { useState, useEffect } from 'react';
import { useAccountsReports } from '@/features/accounts/hooks/useAccountsReports';
import { ledgerApi } from '@/features/accounts/api/ledgerApi';

export default function GeneralLedgerPage() {
    const { data, loading, fetchReport } = useAccountsReports();
    const [ledgers, setLedgers] = useState([]);
    const [ledgerId, setLedgerId] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        ledgerApi
            .getAll({ limit: 500 })
            .then((res) => {
                const list = res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? [];
                setLedgers(Array.isArray(list) ? list : []);
            })
            .catch((err) => {
                console.error('Failed to load ledgers:', err?.response?.data || err.message);
                setLedgers([]);
            });
    }, []);

    const handleGenerate = () => {
        if (!ledgerId) return alert('Please select a ledger');
        fetchReport('general-ledger', { ledgerId, fromDate, toDate });
    };

    const formatAmount = (value) =>
        Number(value || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">General Ledger</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Detailed transaction history of a selected ledger
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Filters */}
                <div className="bg-white border border-gray-200 rounded shadow-sm p-4 mb-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ledger <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={ledgerId}
                                onChange={(e) => setLedgerId(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[240px] focus:outline-none focus:ring-2 focus:ring-[#714B67] focus:border-transparent"
                            >
                                <option value="">Select Ledger</option>
                                {ledgers.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.code} — {l.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67] focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67] focus:border-transparent"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-[#714B67] hover:bg-[#5a3c53] text-white px-5 py-2 rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Show Ledger'}
                        </button>
                    </div>
                </div>

                {/* Report */}
                {data && (
                    <div className="space-y-4">
                        {/* Ledger Summary */}
                        <div className="bg-white border border-gray-200 rounded shadow-sm p-4">
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ledger</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {data.ledger?.code} — {data.ledger?.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Opening Balance</p>
                                    <p className="text-sm font-mono font-medium text-gray-900">
                                        {formatAmount(data.ledger?.openingBalance)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Current Balance</p>
                                    <p className="text-sm font-mono font-medium text-gray-900">
                                        {formatAmount(data.ledger?.currentBalance)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Voucher</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Narration</th>
                                        <th className="px-4 py-3 text-right">Debit</th>
                                        <th className="px-4 py-3 text-right">Credit</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {(!data.entries || data.entries.length === 0) ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                                No transactions found for the selected period
                                            </td>
                                        </tr>
                                    ) : (
                                        data.entries.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-2.5 text-gray-800 whitespace-nowrap">
                                                    {new Date(entry.voucher.voucherDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-gray-800">
                                                    {entry.voucher.voucherNumber}
                                                </td>
                                                <td className="px-4 py-2.5">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {entry.voucher.voucherType}
                            </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate">
                                                    {entry.voucher.narration || entry.notes || '—'}
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                                                    {Number(entry.debit) > 0 ? formatAmount(entry.debit) : ''}
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                                                    {Number(entry.credit) > 0 ? formatAmount(entry.credit) : ''}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!data && !loading && (
                    <div className="bg-white border border-gray-200 rounded shadow-sm py-16 text-center text-gray-500 text-sm">
                        Select a ledger and click <strong>Show Ledger</strong> to view transactions
                    </div>
                )}
            </div>
        </div>
    );
}