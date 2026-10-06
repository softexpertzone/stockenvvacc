'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export default function BatchSelector({
                                          productVariantId,
                                          binId,
                                          value,
                                          onChange,
                                          disabled = false,
                                      }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadBatches() {
            if (!productVariantId) {
                setBatches([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const params = new URLSearchParams({ productVariantId });
                if (binId) params.append('binId', binId);

                const res = await apiClient.get(`/api/inventory/batches?${params.toString()}`);

                if (cancelled) return;

                const list = res.data?.data || [];
                setBatches(list);

                // Auto-select when only one batch has stock
                if (list.length === 1 && !value) {
                    onChange?.(list[0].id);
                }
            } catch (err) {
                console.error('Failed to load batches:', err);
                if (!cancelled) setBatches([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadBatches();

        return () => {
            cancelled = true;
        };
    }, [productVariantId, binId]);

    if (!productVariantId) {
        return (
            <input
                disabled
                className="w-full h-9 px-2 border border-slate-300 rounded text-xs bg-slate-50 text-slate-400"
                placeholder="Select product first"
            />
        );
    }

    return (
        <select
            className="w-full h-9 px-2 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500"
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled || loading}
        >
            <option value="">
                {loading
                    ? 'Loading batches...'
                    : batches.length === 0
                        ? 'No stock in this bin'
                        : '-- Select Batch --'}
            </option>

            {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                    {batch.batchNumber}
                    {batch.availableQty != null ? ` (Avail: ${batch.availableQty})` : ''}
                    {batch.expiryDate
                        ? ` · Exp ${new Date(batch.expiryDate).toLocaleDateString()}`
                        : ''}
                </option>
            ))}
        </select>
    );
}