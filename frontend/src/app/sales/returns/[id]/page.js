'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Package,
    FileText,
    AlertCircle,
    CheckCircle,
    RotateCcw,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function SalesReturnDetailPage({ params }) {
    // Next.js 15+ passes params as a Promise
    const resolvedParams = typeof params?.then === 'function' ? use(params) : params;
    const id = resolvedParams?.id;

    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchReturn = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await apiClient.get(`/returns/customer/${id}`);
            const payload = res.data?.data || res.data;
            setData(payload);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Failed to load return'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchReturn();
    }, [id]);

    const handleReceive = async () => {
        if (!confirm('Receive this return into inventory? This cannot be undone easily.')) {
            return;
        }
        try {
            setActionLoading(true);
            setError('');
            setSuccess('');
            const res = await apiClient.post(`/returns/customer/${id}/receive`);
            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Receive failed');
            }
            setSuccess('Return received successfully. Stock has been updated.');
            await fetchReturn();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Failed to receive return'
            );
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Loading return...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                    {error || 'Return not found'}
                </div>
                <Link href="/sales/returns" className="inline-block mt-4 text-blue-600 hover:underline">
                    ← Back to list
                </Link>
            </div>
        );
    }

    const canReceive = ['DRAFT', 'APPROVED'].includes(data.status);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/sales/returns"
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <RotateCcw className="w-5 h-5 text-blue-600" />
                            {data.returnNumber || 'Sales Return'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Status:{' '}
                            <span className="font-medium text-gray-800">{data.status}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {canReceive && (
                        <button
                            onClick={handleReceive}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60"
                        >
                            <CheckCircle className="w-4 h-4" />
                            {actionLoading ? 'Receiving...' : 'Receive into Stock'}
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6 space-y-6">
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <p className="text-sm">{success}</p>
                    </div>
                )}

                {/* Header info */}
                <div className="bg-white rounded-xl border shadow-sm">
                    <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                        <h2 className="font-medium flex items-center gap-2 text-gray-800">
                            <FileText className="w-4 h-4 text-gray-500" />
                            Return Information
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Customer</span>
                            <p className="font-medium text-gray-900">
                                {data.partner?.companyName || data.partner?.name || '—'}
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-500">Disposition</span>
                            <p className="font-medium text-gray-900">{data.disposition || '—'}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Created</span>
                            <p className="font-medium text-gray-900">
                                {data.createdAt
                                    ? new Date(data.createdAt).toLocaleString()
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-500">Notes</span>
                            <p className="font-medium text-gray-900">{data.notes || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-xl border shadow-sm">
                    <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                        <h2 className="font-medium flex items-center gap-2 text-gray-800">
                            <Package className="w-4 h-4 text-gray-500" />
                            Returned Items
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Bin</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Batch</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Qty</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Condition</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Disposition</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {(data.items || []).map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-900">
                                        {item.productVariant?.product?.name ||
                                            item.productVariant?.name ||
                                            item.productVariant?.sku ||
                                            item.productVariantId}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">
                                        {item.bin?.name || item.binId || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">
                                        {item.batch?.batchNumber || item.batchId || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">{item.quantityCount}</td>
                                    <td className="px-4 py-3 text-gray-900">
                                        {item.reason?.name || item.reason?.code || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">{item.conditionGrade || '—'}</td>
                                    <td className="px-4 py-3 text-gray-900">{item.disposition || '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}