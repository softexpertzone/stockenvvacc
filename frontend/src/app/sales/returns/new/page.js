'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Save,
    Package,
    FileText,
    AlertCircle,
    RotateCcw,
    Search,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import BuyerSelector from '@/features/sales/components/BuyerSelector';

export default function NewSalesReturnPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loadingLines, setLoadingLines] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        partnerId: '',
        salesOrderId: '',
        salesOrderNumber: '',
        notes: '',
        items: [],
    });

    // ========== LOAD RETURNABLE LINES FROM SALES ORDER ==========
    const loadFromSalesOrder = async (salesOrderId) => {
        if (!salesOrderId) return;

        setLoadingLines(true);
        setError('');
        try {
            const res = await apiClient.get(`/returns/customer/from-sales-order/${salesOrderId}`);
            const data = res.data?.data;

            if (!data || !data.lines?.length) {
                setError('No returnable items found on this Sales Order (already fully returned or not delivered).');
                setForm((prev) => ({ ...prev, items: [] }));
                return;
            }

            setForm((prev) => ({
                ...prev,
                partnerId: data.salesOrder.partnerId || prev.partnerId,
                salesOrderId: data.salesOrder.id,
                salesOrderNumber: data.salesOrder.orderNumber,
                items: data.lines.map((line) => ({
                    id: crypto.randomUUID(),
                    ...line,
                })),
            }));
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Failed to load Sales Order lines'
            );
            setForm((prev) => ({ ...prev, items: [] }));
        } finally {
            setLoadingLines(false);
        }
    };

    const updateLine = (id, field, value) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            ),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!form.salesOrderId) {
                throw new Error('Sales Order is required');
            }
            if (!form.partnerId) {
                throw new Error('Customer is required');
            }
            if (!form.items.length) {
                throw new Error('No items to return');
            }

            for (const [index, item] of form.items.entries()) {
                if (!item.quantityCount || Number(item.quantityCount) < 1) {
                    throw new Error(`Line ${index + 1}: Quantity must be at least 1`);
                }
                if (Number(item.quantityCount) > item.maxReturnable) {
                    throw new Error(
                        `Line ${index + 1}: Cannot return more than ${item.maxReturnable} (max returnable)`
                    );
                }
                if (!item.reasonId) {
                    throw new Error(`Line ${index + 1}: Reason is required`);
                }
                if (!item.binId) {
                    throw new Error(
                        `Line ${index + 1}: Original Bin is missing. Cannot create return safely.`
                    );
                }
            }

            const payload = {
                partnerId: form.partnerId,
                salesOrderId: form.salesOrderId,
                notes: form.notes || null,
                items: form.items.map((item) => ({
                    productVariantId: item.productVariantId,
                    binId: item.binId,
                    batchId: item.batchId || null,
                    originalSalesOrderItemId: item.originalSalesOrderItemId || null,
                    quantityCount: Number(item.quantityCount),
                    quantityKg: Number(item.quantityKg) || 0,
                    reasonId: item.reasonId,
                    conditionGrade: item.conditionGrade || 'A',
                    disposition: item.disposition || 'QUARANTINE',
                    notes: item.notes || null,
                })),
            };

            const res = await apiClient.post('/returns/customer', payload);

            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Failed to create Sales Return');
            }

            router.push('/sales/returns');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Failed to create Sales Return'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sticky Header */}
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
                            New Sales Return (RMA)
                        </h1>
                        <p className="text-sm text-gray-500">
                            Select Sales Order → System auto-fills products, Bin & Batch
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/sales/returns"
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                        Cancel
                    </Link>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || form.items.length === 0}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Create Return'}
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6 space-y-6">
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Section 1: Header Information */}
                <div className="bg-white rounded-xl border shadow-sm">
                    <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                        <h2 className="font-medium flex items-center gap-2 text-gray-800">
                            <FileText className="w-4 h-4 text-gray-500" />
                            Return Information
                        </h2>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Customer <span className="text-red-500">*</span>
                            </label>
                            <BuyerSelector
                                value={form.partnerId}
                                onChange={(value) => setForm({ ...form, partnerId: value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Sales Order <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Sales Order Number or ID"
                                    value={form.salesOrderId}
                                    onChange={(e) =>
                                        setForm({ ...form, salesOrderId: e.target.value })
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={() => loadFromSalesOrder(form.salesOrderId)}
                                    disabled={loadingLines || !form.salesOrderId}
                                    className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Search className="w-4 h-4" />
                                    {loadingLines ? 'Loading...' : 'Load'}
                                </button>
                            </div>
                            {form.salesOrderNumber && (
                                <p className="text-xs text-green-600 mt-1">
                                    Loaded: {form.salesOrderNumber}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Notes
                            </label>
                            <textarea
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Customer complaint, inspection notes..."
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Auto-loaded Lines */}
                <div className="bg-white rounded-xl border shadow-sm">
                    <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                        <h2 className="font-medium flex items-center gap-2 text-gray-800">
                            <Package className="w-4 h-4 text-gray-500" />
                            Returned Items
                            <span className="text-xs font-normal text-gray-500 ml-2">
                                (Auto-filled – only change Qty / Reason / Condition / Disposition)
                            </span>
                        </h2>
                    </div>

                    {form.items.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            Select a Sales Order and click <strong>Load</strong> to auto-fill products, Bin & Batch.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Original Bin</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Batch</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Max</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Qty to Return</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Condition</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Disposition</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {form.items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{item.productName}</div>
                                            <div className="text-xs text-gray-500">{item.sku}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                                <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                                    {item.binId
                                                        ? item.binId.slice(0, 8) + '…'
                                                        : 'Missing'}
                                                </span>
                                        </td>
                                        <td className="px-4 py-3">
                                                <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                                    {item.batchId
                                                        ? item.batchId.slice(0, 8) + '…'
                                                        : '—'}
                                                </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            {item.maxReturnable}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="1"
                                                max={item.maxReturnable}
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={item.quantityCount}
                                                onChange={(e) =>
                                                    updateLine(item.id, 'quantityCount', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                required
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={item.reasonId}
                                                onChange={(e) =>
                                                    updateLine(item.id, 'reasonId', e.target.value)
                                                }
                                            >
                                                <option value="">Select Reason</option>
                                                <option value="DAMAGED">Damaged</option>
                                                <option value="QUALITY">Defective / Quality</option>
                                                <option value="WRONG_ITEM">Wrong Item</option>
                                                <option value="CUSTOMER_CHANGE">Customer Changed Mind</option>
                                                <option value="NOT_AS_DESCRIBED">Not as Described</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={item.conditionGrade}
                                                onChange={(e) =>
                                                    updateLine(item.id, 'conditionGrade', e.target.value)
                                                }
                                            >
                                                <option value="A">A - Good</option>
                                                <option value="B">B - Minor Issue</option>
                                                <option value="C">C - Damaged</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={item.disposition}
                                                onChange={(e) =>
                                                    updateLine(item.id, 'disposition', e.target.value)
                                                }
                                            >
                                                <option value="QUARANTINE">Quarantine</option>
                                                <option value="RESTOCK">Restock</option>
                                                <option value="SCRAP">Scrap</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}