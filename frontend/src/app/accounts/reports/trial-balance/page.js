'use client';

import { useState } from 'react';
import { useAccountsReports } from '@/features/accounts/hooks/useAccountsReports';

export default function TrialBalancePage() {
    const { data, loading, fetchReport } = useAccountsReports();
    const [asOnDate, setAsOnDate] = useState(new Date().toISOString().slice(0, 10));

    const handleGenerate = () => {
        fetchReport('trial-balance', { asOnDate });
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Trial Balance</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Summary of all ledger balances as on a specific date
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
                                As on Date
                            </label>
                            <input
                                type="date"
                                value={asOnDate}
                                onChange={(e) => setAsOnDate(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67] focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-[#714B67] hover:bg-[#5a3c53] text-white px-5 py-2 rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Generating...' : 'Generate Report'}
                        </button>
                    </div>
                </div>

                {/* Report Table */}
                {data && (
                    <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Account</th>
                                    <th className="px-4 py-3">Group</th>
                                    <th className="px-4 py-3 text-right">Debit</th>
                                    <th className="px-4 py-3 text-right">Credit</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {data.rows?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                                            No data found for the selected date
                                        </td>
                                    </tr>
                                ) : (
                                    data.rows?.map((row) => (
                                        <tr key={row.ledgerId} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2.5 font-mono text-gray-800">
                                                {row.code}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium text-gray-900">
                                                {row.name}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600">
                                                {row.group || '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                                                {row.debit > 0
                                                    ? Number(row.debit).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })
                                                    : ''}
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">
                                                {row.credit > 0
                                                    ? Number(row.credit).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })
                                                    : ''}
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                                <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-900">
                                    <td colSpan={3} className="px-4 py-3 text-right">
                                        Total
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {Number(data.totalDebit || 0).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {Number(data.totalCredit || 0).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Balance Status */}
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                            {data.isBalanced ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Trial Balance is balanced
                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Trial Balance is not balanced
                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty state before generating */}
                {!data && !loading && (
                    <div className="bg-white border border-gray-200 rounded shadow-sm py-16 text-center text-gray-500 text-sm">
                        Select a date and click <strong>Generate Report</strong> to view the Trial Balance
                    </div>
                )}
            </div>
        </div>
    );
}