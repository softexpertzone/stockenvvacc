'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export default function VendorSelector({ value, onChange }) {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadVendors = async () => {
            try {
                const res = await apiClient.get('/api/partners?type=VENDOR');
                // Handle both possible response shapes
                const list = res.data?.data || res.data || [];
                setVendors(Array.isArray(list) ? list : []);
            } catch (err) {
                console.error('Failed to load vendors:', err);
                setVendors([]);
            } finally {
                setLoading(false);
            }
        };

        loadVendors();
    }, []);

    return (
        <select
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 text-sm"
            disabled={loading}
        >
            <option value="">
                {loading ? 'Loading vendors...' : 'Select a Vendor...'}
            </option>
            {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                    {v.companyName || v.name || v.id}
                </option>
            ))}
        </select>
    );
}