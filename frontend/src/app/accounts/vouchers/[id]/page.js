'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { voucherApi } from '@/features/accounts/api/voucherApi';
import VoucherForm from '@/features/accounts/components/VoucherForm';

export default function VoucherDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await voucherApi.getById(id);
                setVoucher(res.data?.data || res.data);
            } catch (err) {
                alert('Failed to load voucher');
                router.push('/accounts/vouchers');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, router]);

    const handlePost = async () => {
        if (!confirm('Post this voucher? This will update ledger balances.')) return;
        setActionLoading(true);
        try {
            await voucherApi.post(id);
            alert('Voucher posted successfully');
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to post voucher');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        const reason = prompt('Cancellation reason:');
        if (reason === null) return;
        setActionLoading(true);
        try {
            await voucherApi.cancel(id, reason);
            alert('Voucher cancelled');
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel voucher');
        } finally {
            setActionLoading(false);
        }
    };

    // Status badge colors (Odoo / SAP style)
    const getStatusBadge = (status) => {
        const styles = {
            DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            POSTED: 'bg-green-100 text-green-800 border-green-200',
            CANCELLED: 'bg-red-100 text-red-800 border-red-200',
        };
        return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-600">
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Loading voucher...</span>
                </div>
            </div>
        );
    }

    if (!voucher) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Voucher not found</p>
                    <button
                        onClick={() => router.push('/accounts/vouchers')}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Back to Vouchers
                    </button>
                </div>
            </div>
        );
    }

    const isDraft = voucher.status === 'DRAFT';

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
                                {voucher.voucherType} — {voucher.voucherNumber}
                            </h1>
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                                    voucher.status
                                )}`}
                            >
                                {voucher.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {new Date(voucher.voucherDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {isDraft && (
                            <button
                                onClick={handlePost}
                                disabled={actionLoading}
                                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Processing...' : 'Post Voucher'}
                            </button>
                        )}

                        {voucher.status !== 'CANCELLED' && (
                            <button
                                onClick={handleCancel}
                                disabled={actionLoading}
                                className="inline-flex items-center px-4 py-2 bg-white border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        )}

                        <button
                            onClick={() => router.push('/accounts/vouchers')}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md shadow-sm transition-colors"
                        >
                            Back
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {isDraft ? (
                    /* Edit mode for DRAFT */
                    <VoucherForm type={voucher.voucherType} initialData={voucher} />
                ) : (
                    /* Read-only view for POSTED / CANCELLED */
                    <div className="max-w-5xl space-y-6">
                        {/* Info Card */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                                <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                                    Voucher Details
                                </h2>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                                <div>
                                    <span className="block text-xs font-medium text-gray-500 mb-1">Date</span>
                                    <span className="text-gray-800">
                                        {new Date(voucher.voucherDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-medium text-gray-500 mb-1">Status</span>
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                                            voucher.status
                                        )}`}
                                    >
                                        {voucher.status}
                                    </span>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="block text-xs font-medium text-gray-500 mb-1">Narration</span>
                                    <span className="text-gray-800">{voucher.narration || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Entries Table */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                                <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                                    Journal Entries
                                </h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                                            #
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Account
                                        </th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Debit
                                        </th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Credit
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Notes
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {voucher.entries?.map((entry, idx) => (
                                        <tr key={entry.id} className="hover:bg-blue-50/40 transition-colors">
                                            <td className="px-4 py-2.5 text-gray-500 text-center">
                                                {idx + 1}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-800 font-medium">
                                                {entry.ledger?.code} — {entry.ledger?.name}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-gray-900 tabular-nums">
                                                {Number(entry.debit) > 0
                                                    ? Number(entry.debit).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-gray-900 tabular-nums">
                                                {Number(entry.credit) > 0
                                                    ? Number(entry.credit).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600">
                                                {entry.notes || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                    <tfoot>
                                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-medium">
                                        <td colSpan={2} className="px-4 py-3 text-right text-sm text-gray-700">
                                            Total
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-900 tabular-nums font-semibold">
                                            {(() => {
                                                // Prefer backend totals, otherwise calculate from entries
                                                const totalDebit = Number(voucher.totalDebit) ||
                                                    (voucher.entries || []).reduce((sum, e) => sum + Number(e.debit || 0), 0);

                                                return totalDebit.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                });
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-900 tabular-nums font-semibold">
                                            {(() => {
                                                const totalCredit = Number(voucher.totalCredit) ||
                                                    (voucher.entries || []).reduce((sum, e) => sum + Number(e.credit || 0), 0);

                                                return totalCredit.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                });
                                            })()}
                                        </td>
                                        <td></td>
                                    </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}