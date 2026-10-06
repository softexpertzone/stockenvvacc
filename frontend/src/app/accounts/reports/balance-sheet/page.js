'use client';

import { useState } from 'react';
import { useAccountsReports } from '@/features/accounts/hooks/useAccountsReports';

export default function BalanceSheetPage() {
    const { data, loading, fetchReport } = useAccountsReports();
    const [asOnDate, setAsOnDate] = useState(new Date().toISOString().slice(0, 10));

    const handleGenerate = () => {
        fetchReport('balance-sheet', { asOnDate });
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
                        <h1 className="text-xl font-semibold text-gray-900">Balance Sheet</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Statement of financial position as on a specific date
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

                {/* Report */}
                {data && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Assets */}
                        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
                                <h2 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                                    Assets
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {data.assets?.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                        No assets recorded
                                    </div>
                                ) : (
                                    data.assets?.map((item, i) => (
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
                                <span className="text-gray-800">Total Assets</span>
                                <span className="font-mono tabular-nums text-blue-700">
                  {formatAmount(data.totalAssets)}
                </span>
                            </div>
                        </div>

                        {/* Liabilities & Equity */}
                        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 bg-amber-50">
                                <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                                    Liabilities & Equity
                                </h2>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {/* Liabilities Section */}
                                <div className="px-4 py-2 bg-gray-50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Liabilities
                                    </p>
                                </div>
                                {data.liabilities?.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-gray-500">No liabilities</div>
                                ) : (
                                    data.liabilities?.map((item, i) => (
                                        <div
                                            key={`liab-${i}`}
                                            className="flex justify-between items-center px-4 py-2.5 text-sm hover:bg-gray-50"
                                        >
                                            <span className="text-gray-800">{item.name}</span>
                                            <span className="font-mono tabular-nums text-gray-900">
                        {formatAmount(item.amount)}
                      </span>
                                        </div>
                                    ))
                                )}

                                {/* Equity Section */}
                                <div className="px-4 py-2 bg-gray-50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Equity
                                    </p>
                                </div>
                                {data.equity?.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-gray-500">No equity</div>
                                ) : (
                                    data.equity?.map((item, i) => (
                                        <div
                                            key={`eq-${i}`}
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
                                <span className="text-gray-800">Total Liabilities & Equity</span>
                                <span className="font-mono tabular-nums text-amber-700">
                  {formatAmount(data.totalLiabilitiesAndEquity)}
                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!data && !loading && (
                    <div className="bg-white border border-gray-200 rounded shadow-sm py-16 text-center text-gray-500 text-sm">
                        Select a date and click <strong>Generate Report</strong> to view the Balance Sheet
                    </div>
                )}
            </div>
        </div>
    );
}