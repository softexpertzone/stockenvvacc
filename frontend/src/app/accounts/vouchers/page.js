/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useVouchers } from '@/features/accounts/hooks/useVouchers';

export default function VouchersPage() {
    const { vouchers, loading, fetchVouchers } = useVouchers();

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    const getStatusBadge = (status) => {
        const styles = {
            DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            POSTED: 'bg-green-100 text-green-800 border-green-200',
            CANCELLED: 'bg-red-100 text-red-800 border-red-200',
        };
        return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getTypeBadge = (type) => {
        const styles = {
            RECEIPT: 'bg-green-50 text-green-700 border-green-200',
            PAYMENT: 'bg-red-50 text-red-700 border-red-200',
            CONTRA: 'bg-blue-50 text-blue-700 border-blue-200',
            JOURNAL: 'bg-purple-50 text-purple-700 border-purple-200',
        };
        return styles[type] || 'bg-gray-50 text-gray-700 border-gray-200';
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
                            Voucher Register
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            View and manage all accounting vouchers
                        </p>
                    </div>

                    {/* Create buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/accounts/vouchers/receipt"
                            className="inline-flex items-center px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                        >
                            + Receipt
                        </Link>
                        <Link
                            href="/accounts/vouchers/payment"
                            className="inline-flex items-center px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                        >
                            + Payment
                        </Link>
                        <Link
                            href="/accounts/vouchers/contra"
                            className="inline-flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                        >
                            + Contra
                        </Link>
                        <Link
                            href="/accounts/vouchers/journal"
                            className="inline-flex items-center px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                        >
                            + Journal
                        </Link>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Table Card */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            {loading ? (
                                <span>Loading vouchers...</span>
                            ) : (
                                <>
                                    <span className="font-medium">
                                        {Array.isArray(vouchers) ? vouchers.length : 0}
                                    </span>{' '}
                                    voucher(s)
                                </>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-gray-500">
                            <svg
                                className="animate-spin h-5 w-5 mr-3 text-blue-600"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            <span className="text-sm">Loading vouchers...</span>
                        </div>
                    ) : (
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {(Array.isArray(vouchers) ? vouchers : []).map((v) => (
                                    <tr
                                        key={v.id}
                                        className="hover:bg-blue-50/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                            {v.voucherNumber}
                                        </td>
                                        <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getTypeBadge(
                                                        v.voucherType
                                                    )}`}
                                                >
                                                    {v.voucherType}
                                                </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                            {new Date(v.voucherDate).toLocaleDateString()}
                                        </td>
                                        <td
                                            className="px-4 py-3 text-gray-600 max-w-xs truncate"
                                            title={v.narration || ''}
                                        >
                                            {v.narration || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-900 tabular-nums">
                                            {Number(v.totalDebit).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-900 tabular-nums">
                                            {Number(v.totalCredit).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                                                        v.status
                                                    )}`}
                                                >
                                                    {v.status}
                                                </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/accounts/vouchers/${v.id}`}
                                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}

                                {(Array.isArray(vouchers) ? vouchers : []).length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-16 text-center text-gray-500"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <svg
                                                    className="w-10 h-10 text-gray-300"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                                <span className="text-sm">No vouchers found</span>
                                                <span className="text-xs text-gray-400">
                                                        Create a new voucher using the buttons above
                                                    </span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}