'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Truck,
    XCircle,
    Package,
    User,
    Calendar,
    FileText,
    AlertCircle,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';          // ← ADD THIS

const STATUS_CONFIG = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
    CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    SHIPPED: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: Truck },
    DONE: { label: 'Done', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PurchaseReturnDetailPage() {
    const { id } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        async function loadData() {
            try {
                // ✅ FIXED: use apiClient instead of relative fetch
                const res = await apiClient.get(`/api/returns/purchase/${id}`);

                if (cancelled) return;

                setData(res.data.data || res.data);
                setError('');
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.message ||
                        err.response?.data?.error ||
                        err.message ||
                        'Return not found'
                    );
                    setData(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const handleConfirm = async () => {
        if (!confirm('Confirm this Purchase Return? Stock will be deducted immediately.')) return;

        try {
            setActionLoading(true);
            setError('');

            // ✅ FIXED: use apiClient instead of relative fetch
            const res = await apiClient.patch(`/api/returns/purchase/${id}/confirm`);

            // Refresh data
            setLoading(true);
            const refreshRes = await apiClient.get(`/api/returns/purchase/${id}`);
            setData(refreshRes.data.data || refreshRes.data);

            alert('Purchase Return confirmed successfully. Stock has been updated.');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Failed to confirm return'
            );
        } finally {
            setActionLoading(false);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-gray-500">
                Loading return details...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-10 text-center">
                <p className="text-gray-500 mb-4">Purchase Return not found</p>
                <Link href="/purchase/returns" className="text-blue-600 hover:underline">
                    Back to list
                </Link>
            </div>
        );
    }

    const status = STATUS_CONFIG[data.status] || STATUS_CONFIG.DRAFT;
    const StatusIcon = status.icon;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/purchase/returns"
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-semibold">{data.returnNumber}</h1>
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                                >
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {status.label}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">Purchase Return Details</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {data.status === 'DRAFT' && (
                            <button
                                onClick={handleConfirm}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60"
                            >
                                <CheckCircle className="w-4 h-4" />
                                {actionLoading ? 'Confirming...' : 'Confirm Return'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6 space-y-6">
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertCircle className="w-5 h-5 mt-0.5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border rounded-xl p-5">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                            <User className="w-4 h-4" />
                            Vendor
                        </div>
                        <p className="font-medium">
                            {data.partner?.companyName || data.partner?.name || '—'}
                        </p>
                    </div>

                    <div className="bg-white border rounded-xl p-5">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                            <Calendar className="w-4 h-4" />
                            Created Date
                        </div>
                        <p className="font-medium">
                            {new Date(data.createdAt).toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-white border rounded-xl p-5">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                            <FileText className="w-4 h-4" />
                            Reference
                        </div>
                        <p className="font-medium text-sm">
                            {data.purchaseOrderId
                                ? `PO: ${data.purchaseOrderId.slice(0, 8)}...`
                                : '—'}
                        </p>
                    </div>
                </div>

                {/* Notes */}
                {data.notes && (
                    <div className="bg-white border rounded-xl p-5">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                        <p className="text-gray-800">{data.notes}</p>
                    </div>
                )}

                {/* Items Table */}
                <div className="bg-white border rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <h2 className="font-medium">Return Items</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-5 py-3 font-medium text-gray-600">Product</th>
                                <th className="text-left px-5 py-3 font-medium text-gray-600">Bin</th>
                                <th className="text-left px-5 py-3 font-medium text-gray-600">Batch</th>
                                <th className="text-right px-5 py-3 font-medium text-gray-600">Qty</th>
                                <th className="text-left px-5 py-3 font-medium text-gray-600">Reason</th>
                                <th className="text-right px-5 py-3 font-medium text-gray-600">Unit Cost</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {(data.items || []).map((item) => (
                                <tr key={item.id}>
                                    <td className="px-5 py-3">
                                        {item.productVariant?.name ||
                                            item.productVariant?.sku ||
                                            item.productVariantId}
                                    </td>
                                    <td className="px-5 py-3">{item.bin?.name || item.binId}</td>
                                    <td className="px-5 py-3">
                                        {item.batch?.batchNumber || item.batchId || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-right font-medium">
                                        {item.quantityCount}
                                    </td>
                                    <td className="px-5 py-3">
                                        {item.reason?.name || item.reasonId}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {item.unitCost ? Number(item.unitCost).toFixed(2) : '—'}
                                    </td>
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