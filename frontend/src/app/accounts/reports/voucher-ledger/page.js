'use client';

import { useState } from 'react';
import { useAccountsReports } from '@/features/accounts/hooks/useAccountsReports';

export default function VoucherLedgerPage() {
    const { data, loading, fetchReport } = useAccountsReports();
    const [voucherType, setVoucherType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const handleGenerate = () => {
        fetchReport('voucher-ledger', { voucherType, fromDate, toDate });
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Page Header - Odoo / SAP style */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
                    Voucher Ledger
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    View and filter voucher entries by type and date range
                </p>
            </div>

            <div className="p-6">
                {/* Filter Bar - SAP Fiori / Odoo control panel style */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                            Filters
                        </h2>
                    </div>

                    <div className="p-5 flex flex-wrap items-end gap-4">
                        {/* Voucher Type */}
                        <div className="min-w-[160px]">
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Voucher Type
                            </label>
                            <select
                                value={voucherType}
                                onChange={(e) => setVoucherType(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Types</option>
                                <option value="RECEIPT">Receipt</option>
                                <option value="PAYMENT">Payment</option>
                                <option value="CONTRA">Contra</option>
                                <option value="JOURNAL">Journal</option>
                            </select>
                        </div>

                        {/* From Date */}
                        <div className="min-w-[150px]">
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* To Date */}
                        <div className="min-w-[150px]">
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                To Date
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Loading...
                                    </>
                                ) : (
                                    'Show'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Table */}
                {data && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        {/* Table toolbar */}
                        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <div className="text-sm text-gray-700">
                                <span className="font-medium">{data.data?.length ?? 0}</span> voucher(s) found
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="bg-gray-100 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Voucher No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Narration
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Debit
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Credit
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {data.data?.length > 0 ? (
                                    data.data.map((v, index) => (
                                        <tr
                                            key={v.id}
                                            className={`hover:bg-blue-50 transition-colors ${
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'
                                            }`}
                                        >
                                            <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                                                {v.voucherNumber}
                                            </td>
                                            <td className="px-4 py-2.5">
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            v.voucherType === 'RECEIPT'
                                ? 'bg-green-100 text-green-800'
                                : v.voucherType === 'PAYMENT'
                                    ? 'bg-red-100 text-red-800'
                                    : v.voucherType === 'CONTRA'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800'
                        }`}
                    >
                        {v.voucherType}
                    </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                                                {new Date(v.voucherDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate" title={v.narration || ''}>
                                                {v.narration || '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-gray-900 tabular-nums">
                                                {Number(v.totalDebit).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-gray-900 tabular-nums">
                                                {Number(v.totalCredit).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                            No vouchers found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty state before first search */}
                {!data && !loading && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm py-16 text-center">
                        <div className="text-gray-400 mb-2">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-sm text-gray-600">
                            Select filters and click <span className="font-medium text-gray-800">Show</span> to load the voucher ledger
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}