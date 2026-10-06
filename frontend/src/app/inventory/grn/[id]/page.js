'use client';

import { use, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetcher';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';

export default function ProcessGRNPage({ params }) {
    const { id } = use(params);
    const router = useRouter();

    const [po, setPo] = useState(null);
    const [godowns, setGodowns] = useState([]);
    const [selectedGodown, setSelectedGodown] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [receiptItems, setReceiptItems] = useState([]);
    const [result, setResult] = useState(null); // { grnNumber, items }

    const [toast, setToast] = useState({ message: '', type: 'success' });

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [poRes, godownRes] = await Promise.all([
                    apiFetch(`/api/purchase/orders/${id}`),
                    apiFetch('/api/warehouse/godowns'),
                ]);

                const poData = poRes?.data?.data ?? poRes?.data ?? null;

                if (poData && (poData.id || Array.isArray(poData.items))) {
                    setPo(poData);
                    setReceiptItems(
                        (poData.items || []).map((item) => ({
                            variantId: item.productVariantId,
                            qty: item.quantityCount ?? item.quantity ?? 0,
                            name:
                                item.productVariant?.product?.name ||
                                item.product?.name ||
                                item.name ||
                                'Unknown Product',
                        }))
                    );
                } else {
                    console.error('PO response:', poRes);
                    setError(
                        poRes?.error
                            ? `Failed to load Purchase Order: ${poRes.error}`
                            : 'Purchase Order data structure is missing.'
                    );
                }

                const actualGodowns = godownRes?.data?.data ?? godownRes?.data ?? [];
                setGodowns(Array.isArray(actualGodowns) ? actualGodowns : []);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to load page data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleUpdateQty = (index, newQty) => {
        const updated = [...receiptItems];
        updated[index].qty = parseInt(newQty, 10) || 0;
        setReceiptItems(updated);
    };

    const handleReceive = async () => {
        if (!selectedGodown) {
            setToast({ message: 'Please select a receiving warehouse.', type: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                purchaseOrderId: id,
                godownId: selectedGodown,
                items: receiptItems.map((item) => ({
                    variantId: item.variantId,
                    productVariantId: item.variantId,
                    qty: parseInt(item.qty, 10) || 0,
                    quantityCount: parseInt(item.qty, 10) || 0,
                })),
            };

            const response = await fetch('/api/purchase/process-grn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('token')
                        ? `Bearer ${localStorage.getItem('token')}`
                        : '',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to process GRN');
            }

            // Prefer structured data from corrected backend
            const items = data.data?.items || data.items || [];
            const grnNumber =
                data.data?.grnNumber ||
                data.grn?.grnNumber ||
                data.grnNumber ||
                'GRN';

            setResult({ grnNumber, items });
            setToast({ message: 'Goods Receipt processed successfully', type: 'success' });
        } catch (err) {
            console.error('GRN Processing Error:', err);
            setToast({ message: err.message || 'Failed to process GRN', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center w-full">
                <div className="flex items-center gap-3 text-[#017E84] font-medium">
                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading order details...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f9fafb] p-8 w-full flex justify-center">
                <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 max-w-lg w-full text-center">
                    {error}
                </div>
            </div>
        );
    }

    // ---------- RESULT SCREEN (Product / Batch / Bin / Qty) ----------
    if (result) {
        return (
            <div className="min-h-screen bg-[#f9fafb] text-[#374151] font-sans w-full pb-12">
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ message: '', type: 'success' })}
                />

                <div className="bg-white border-b border-gray-300 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm">
                    <h1 className="text-lg md:text-xl font-semibold text-gray-800">
                        Receipt completed
                    </h1>
                    <button
                        onClick={() => router.push('/inventory/grn')}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50"
                    >
                        Back to GRN list
                    </button>
                </div>

                <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">
                    <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-teal-50">
                            <p className="text-sm text-gray-600">
                                Document:{' '}
                                <span className="font-mono font-semibold text-teal-800">
                                    {result.grnNumber}
                                </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Use the <strong>Batch</strong> number below when creating a Purchase Return for defective units.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3">Batch</th>
                                    <th className="px-4 py-3">Bin</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {result.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                            No line details returned. Check backend processGRN response (`data.items`).
                                        </td>
                                    </tr>
                                ) : (
                                    result.items.map((row, i) => {
                                        // Safely extract nested data structures
                                        const productName = row.productName || row.name || row.productVariant?.product?.name || '—';
                                        const sku = row.sku || row.productVariant?.sku || '—';
                                        const quantity = row.quantityCount ?? row.qty ?? row.quantity ?? '—';
                                        const batchNumber = row.batchNumber || row.batch?.batchNumber || '—';
                                        // Check for bin.path, binLocation.path, or bin.name
                                        const binPath = row.binName || row.bin?.path || row.binLocation?.path || row.bin?.name || '—';

                                        return (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {productName}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                    {sku}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold">
                                                    {quantity}
                                                </td>
                                                <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-xs">
                        {batchNumber}
                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {binPath}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/purchase/returns/new')}
                            className="px-4 py-2.5 bg-[#017E84] text-white text-sm font-semibold rounded hover:bg-[#01696e]"
                        >
                            Create Purchase Return
                        </button>
                        <button
                            onClick={() => router.push('/inventory/grn')}
                            className="px-4 py-2.5 border border-gray-300 text-sm font-medium rounded hover:bg-gray-50"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ---------- NORMAL FORM ----------
    return (
        <div className="min-h-screen bg-[#f9fafb] text-[#374151] font-sans w-full pb-12 overflow-x-hidden">
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            <div className="bg-white border-b border-gray-300 px-4 md:px-6 py-4 flex items-center justify-between w-full relative z-20 shadow-sm">
                <h1 className="text-lg md:text-xl font-semibold text-gray-800 tracking-tight">
                    Process Receipt for PO{' '}
                    <span className="text-[#017E84] font-mono ml-1">#{po?.purchaseNumber || id}</span>
                </h1>
            </div>

            <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 w-full space-y-6">
                <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full relative">
                    <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0" />
                    <div className="p-5 sm:p-6 pt-7 sm:pt-8">
                        <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                            Receive into Warehouse
                        </label>
                        <select
                            className="w-full border border-gray-300 rounded-sm px-4 py-3 bg-gray-50 text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#017E84]/50 focus:border-[#017E84]"
                            value={selectedGodown}
                            onChange={(e) => setSelectedGodown(e.target.value)}
                        >
                            <option value="" disabled>
                                -- Select a warehouse --
                            </option>
                            {godowns.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full relative">
                    <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0" />
                    <div className="p-4 sm:p-6 pt-7 sm:pt-8 flex flex-col h-full">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                <tr className="border-b-2 border-gray-200 bg-gray-50/50">
                                    <th className="p-4 font-bold text-gray-500 text-xs uppercase tracking-wider w-[70%]">
                                        Item
                                    </th>
                                    <th className="p-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-right w-[30%]">
                                        Qty Received
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {receiptItems.length > 0 ? (
                                    receiptItems.map((item, index) => (
                                        <tr key={index} className="hover:bg-teal-50/30 transition-colors">
                                            <td className="p-4 text-sm font-semibold text-gray-800">
                                                {item.name}
                                            </td>
                                            <td className="p-4 text-right">
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => handleUpdateQty(index, e.target.value)}
                                                    className="w-24 sm:w-28 text-center border border-gray-300 rounded-sm px-3 py-2 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#017E84]/50"
                                                    min="0"
                                                />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="2" className="p-8 text-center text-gray-500">
                                            No items found for this order.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <button
                                disabled={submitting || !selectedGodown}
                                onClick={handleReceive}
                                className={`w-full py-3.5 rounded-sm text-sm sm:text-base font-bold uppercase tracking-wider transition-colors shadow-sm flex justify-center items-center gap-2
                                    ${
                                    submitting || !selectedGodown
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-[#017E84] hover:bg-[#01696e] text-white'
                                }`}
                            >
                                {submitting ? 'Processing...' : 'Confirm Stock Receipt'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}