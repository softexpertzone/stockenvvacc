'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetcher';

export default function StockReclassificationModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [godowns, setGodowns] = useState([]);

    const [godownId, setGodownId] = useState('');
    const [items, setItems] = useState([
        { originalVariantId: '', originalProductName: '', newVariantId: '', newProductName: '', quantity: '' }
    ]);

    useEffect(() => {
        if (isOpen) {
            const fetchGodowns = async () => {
                try {
                    const res = await apiFetch('/inventory/godowns');
                    let data = [];
                    if (Array.isArray(res)) data = res;
                    else if (Array.isArray(res?.data)) data = res.data;
                    else if (Array.isArray(res?.data?.data)) data = res.data.data;
                    setGodowns(data);
                } catch (err) {
                    console.error("Failed to fetch godowns:", err);
                    setGodowns([]);
                }
            };
            fetchGodowns();
        }
    }, [isOpen]);

    // Prevent body scroll when panel is open, but keep ledger fully interactive
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItemRow = () => {
        setItems([...items, { originalVariantId: '', originalProductName: '', newVariantId: '', newProductName: '', quantity: '' }]);
    };

    const removeItemRow = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const formattedItems = items.map(item => ({
            originalVariantId: item.originalVariantId,
            newVariantId: item.newVariantId,
            quantity: parseInt(item.quantity, 10) || 0
        }));

        const payload = {
            godownId,
            items: formattedItems
        };

        try {
            const res = await apiFetch('/internal-ops/reevaluate-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.error) {
                setError(res.error);
                return;
            }

            // Reset form
            setGodownId('');
            setItems([{ originalVariantId: '', originalProductName: '', newVariantId: '', newProductName: '', quantity: '' }]);

            // Notify parent (refresh + toast)
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to process stock reclassification.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Right-side panel only – NO full-screen dim overlay.
                Ledger stays fully visible, selectable and copyable underneath. */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl h-full bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-slide-in-right">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-[#374151]">Stock Re-evaluation</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                            Quickly Fix Mislabeled Stock
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 transition p-1 rounded hover:bg-gray-200"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-sm text-sm">
                            {error}
                        </div>
                    )}

                    {/* Helper tip */}
                    <div className="mb-5 p-3 bg-teal-50 border border-teal-100 rounded-sm text-xs text-teal-800">
                        <span className="font-semibold">Tip:</span> The ledger on the left stays active.
                        You can select &amp; copy any SKU / product name directly into the fields below.
                    </div>

                    <form id="reclassification-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Warehouse */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Warehouse / Godown *
                            </label>
                            <select
                                required
                                value={godownId}
                                onChange={(e) => setGodownId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84] bg-white"
                            >
                                <option value="">Select Warehouse</option>
                                {Array.isArray(godowns) && godowns.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Items */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b pb-2">
                                <h3 className="text-sm font-bold text-gray-700">Products to Convert</h3>
                                <button
                                    type="button"
                                    onClick={addItemRow}
                                    className="text-xs font-medium text-[#017E84] hover:text-teal-800 bg-teal-50 px-2.5 py-1 rounded-sm"
                                >
                                    + Add Row
                                </button>
                            </div>

                            {items.map((item, index) => (
                                <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-sm relative space-y-3">
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItemRow(index)}
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                            title="Remove Item"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Original Product */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                                            Original Product (Change From) *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Product name (for your reference)"
                                            value={item.originalProductName}
                                            onChange={(e) => handleItemChange(index, 'originalProductName', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] outline-none"
                                        />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Original SKU / Variant ID *"
                                            value={item.originalVariantId}
                                            onChange={(e) => handleItemChange(index, 'originalVariantId', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] outline-none font-mono"
                                        />
                                    </div>

                                    {/* New Product */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                                            New Corrected Product (Convert To) *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Product name (for your reference)"
                                            value={item.newProductName}
                                            onChange={(e) => handleItemChange(index, 'newProductName', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] outline-none"
                                        />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Corrected SKU / Variant ID *"
                                            value={item.newVariantId}
                                            onChange={(e) => handleItemChange(index, 'newVariantId', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                                            Quantity *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            placeholder="Enter quantity"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] outline-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="reclassification-form"
                        disabled={loading}
                        className="px-6 py-2 text-sm font-bold text-white bg-[#017E84] rounded-sm hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Confirm Reclassification'}
                    </button>
                </div>
            </div>
        </>
    );
}
