'use client';

import { useState } from 'react';
import { useAccountsReports } from '@/features/accounts/hooks/useAccountsReports';

export default function ProfitLossPage() {
    const { data, loading, fetchReport } = useAccountsReports();
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

    const handleGenerate = () => {
        fetchReport('profit-loss', { fromDate, toDate });
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
                        <h1 className="text-xl font-semibold text-gray-900">Profit & Loss Account</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Income and expenses for the selected period
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
                                From Date
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                To Date
                            </label>
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
                            {loading ? 'Generating...' : 'Generate Report'}
                        </button>
                    </div>
                </div>

                {/* Report */}
                {data && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Income Card */}
                            <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200 bg-green-50">
                                    <h2 className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                                        Income
                                    </h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {data.income?.length === 0 ? (
                                        <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                            No income recorded
                                        </div>
                                    ) : (
                                        data.income?.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex justify-between items-center px-4 py-2.5 text-sm hover:bg-gray-50"
                                            >
                                                <span className="text-gray-800">{item.name}</span>
                                                <span className="font-mono tabular-nums text-gray-900">
                          {formatAmount(item.amount)}
                        </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center font-semibold text-sm">
                                    <span className="text-gray-800">Total Income</span>
                                    <span className="font-mono tabular-nums text-green-700">
                    {formatAmount(data.totalIncome)}
                  </span>
                                </div>
                            </div>

                            {/* Expenses Card */}
                            <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200 bg-red-50">
                                    <h2 className="text-sm font-semibold text-red-800 uppercase tracking-wide">
                                        Expenses
                                    </h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {data.expenses?.length === 0 ? (
                                        <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                            No expenses recorded
                                        </div>
                                    ) : (
                                        data.expenses?.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex justify-between items-center px-4 py-2.5 text-sm hover:bg-gray-50"
                                            >
                                                <span className="text-gray-800">{item.name}</span>
                                                <span className="font-mono tabular-nums text-gray-900">
                          {formatAmount(item.amount)}
                        </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center font-semibold text-sm">
                                    <span className="text-gray-800">Total Expenses</span>
                                    <span className="font-mono tabular-nums text-red-700">
                    {formatAmount(data.totalExpenses)}
                  </span>
                                </div>
                            </div>
                        </div>

                        {/* Net Profit / Loss */}
                        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                            <div
                                className={`px-6 py-5 flex items-center justify-between ${
                                    (data.netProfit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
                                }`}
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Net {(data.netProfit || 0) >= 0 ? 'Profit' : 'Loss'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        For the selected period
                                    </p>
                                </div>
                                <div
                                    className={`text-2xl font-bold tabular-nums ${
                                        (data.netProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                                    }`}
                                >
                                    {formatAmount(Math.abs(data.netProfit || 0))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!data && !loading && (
                    <div className="bg-white border border-gray-200 rounded shadow-sm py-16 text-center text-gray-500 text-sm">
                        Select a date range and click <strong>Generate Report</strong> to view the Profit & Loss Account
                    </div>
                )}
            </div>
        </div>
    );
}