'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export default function BuyerSelector({ value, onChange, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [buyers, setBuyers] = useState([]);
    const [selectedBuyer, setSelectedBuyer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;

        const loadBuyers = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get('/api/partners?type=BUYER');
                const list = res.data?.data || res.data || [];
                if (isMounted) {
                    setBuyers(Array.isArray(list) ? list : []);
                }
            } catch (err) {
                console.error('Failed to load buyers:', err);
                if (isMounted) setBuyers([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        loadBuyers();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    const filteredBuyers = (Array.isArray(buyers) ? buyers : []).filter((b) => {
        const name = (b.companyName || b.name || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    const handleSelect = (buyer) => {
        setSelectedBuyer(buyer);
        onSelect?.(buyer);
        onChange?.(buyer.id);
        setIsOpen(false);
    };

    const displayName =
        selectedBuyer?.companyName ||
        selectedBuyer?.name ||
        (value ? 'Selected' : 'Click to select a buyer...');

    return (
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
                Select Buyer
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full text-left p-4 border border-gray-300 rounded-xl bg-white text-gray-900 hover:border-blue-500 transition shadow-sm"
            >
                {displayName}
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Select Buyer</h2>

                        <input
                            placeholder="Search by name..."
                            className="w-full border border-gray-300 p-3 rounded-xl mb-4 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <div className="max-h-80 overflow-y-auto">
                            {loading ? (
                                <p className="text-center text-gray-500 py-6">Loading...</p>
                            ) : filteredBuyers.length === 0 ? (
                                <p className="text-center text-gray-500 py-6">No buyers found</p>
                            ) : (
                                filteredBuyers.map((buyer) => (
                                    <div
                                        key={buyer.id}
                                        onClick={() => handleSelect(buyer)}
                                        className="p-4 border-b hover:bg-blue-50 cursor-pointer"
                                    >
                                        <p className="font-bold text-gray-900">
                                            {buyer.companyName || buyer.name}
                                        </p>
                                        <p className="text-xs text-gray-500">ID: {buyer.id}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="mt-4 w-full py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}