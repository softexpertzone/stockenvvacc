'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetcher';

export default function AttributeManagement() {
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newAttrName, setNewAttrName] = useState('');
    const [newValue, setNewValue] = useState({});

    // UI states for loading interactions
    const [creatingAttr, setCreatingAttr] = useState(false);
    const [addingValueTo, setAddingValueTo] = useState(null);

    // Soft messages
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 4000);
    };

    useEffect(() => {
        const fetchAttributes = async () => {
            try {
                const res = await apiFetch('/api/settings/attributes');
                setAttributes(res.data || []);
            } catch (err) {
                console.error("Failed to fetch:", err);
                showToast('Failed to load attributes');
            } finally {
                setLoading(false);
            }
        };

        fetchAttributes();
    }, []);

    const refreshData = async () => {
        const res = await apiFetch('/api/settings/attributes');
        setAttributes(res.data || []);
    };

    const handleCreateDefinition = async (e) => {
        e.preventDefault();
        if (!newAttrName.trim()) return;

        setCreatingAttr(true);
        try {
            const res = await apiFetch('/api/settings/attributes', {
                method: 'POST',
                body: JSON.stringify({
                    name: newAttrName.trim(),
                    values: []
                })
            });

            if (res.error) {
                showToast(res.error || 'Failed to create attribute');
                return;
            }

            setNewAttrName('');
            await refreshData();
            showToast('Attribute created successfully', 'success');
        } catch (err) {
            console.error("Create Attribute Error:", err);
            showToast(err.message || 'Failed to create attribute');
        } finally {
            setCreatingAttr(false);
        }
    };

    const handleAddValue = async (attributeDefId) => {
        const value = newValue[attributeDefId]?.trim();
        if (!value) return;

        // Frontend guard: block exact duplicate before calling API
        const attr = attributes.find(a => a.id === attributeDefId);
        const alreadyExists = attr?.values?.some(
            v => String(v.value).toLowerCase() === value.toLowerCase()
        );
        if (alreadyExists) {
            showToast(`"${value}" already exists for this attribute`);
            return;
        }

        setAddingValueTo(attributeDefId);
        try {
            const res = await apiFetch(`/api/settings/attributes/${attributeDefId}/values`, {
                method: 'POST',
                body: JSON.stringify({ value })
            });

            // apiFetch returns { data, error, status } on failure
            if (res.error || res.status >= 400) {
                const msg = res.error || res.message || 'Failed to add attribute value';
                // Friendly message for unique constraint
                if (
                    String(msg).toLowerCase().includes('unique') ||
                    String(msg).toLowerCase().includes('already exists') ||
                    res.status === 409
                ) {
                    showToast(`"${value}" already exists for this attribute`);
                } else {
                    showToast(msg);
                }
                return;
            }

            setNewValue({ ...newValue, [attributeDefId]: '' });
            await refreshData();
            showToast(`"${value}" added successfully`, 'success');
        } catch (err) {
            console.error("Add Value Error:", err);
            const msg = err?.message || 'Failed to add attribute value';
            if (String(msg).toLowerCase().includes('unique') || String(msg).toLowerCase().includes('already')) {
                showToast(`"${value}" already exists for this attribute`);
            } else {
                showToast(msg);
            }
        } finally {
            setAddingValueTo(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f9fafb] p-4 md:p-8 text-[#374151]">
            {/* Soft toast */}
            {toast.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4">
                    <div
                        className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
                            toast.type === 'success'
                                ? 'bg-green-50 border-green-300 text-green-800'
                                : 'bg-amber-50 border-amber-300 text-amber-900'
                        }`}
                    >
                        {toast.message}
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto flex flex-col h-full gap-6">

                {/* HEADER */}
                <div>
                    <h1 className="text-2xl font-bold text-[#374151] tracking-tight uppercase">Product Attributes</h1>
                    <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider text-[11px] font-semibold">
                        Manage global attribute definitions and their variants
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* LEFT PANEL: CREATE ATTRIBUTE */}
                    <div className="w-full lg:w-1/3 bg-white rounded-sm border border-gray-200 shadow-sm relative flex-shrink-0 h-fit sticky top-6">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                        <div className="p-4 md:p-6">
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-5">
                                Create New Attribute
                            </h2>

                            <form onSubmit={handleCreateDefinition} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Attribute Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Color, Size, Material"
                                        value={newAttrName}
                                        onChange={(e) => setNewAttrName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm outline-none bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                        required
                                    />
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={creatingAttr || !newAttrName.trim()}
                                        className="w-full bg-[#017E84] hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-sm text-sm transition-colors uppercase tracking-wider flex justify-center items-center"
                                    >
                                        {creatingAttr ? "Saving..." : "Add Attribute"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT PANEL: ATTRIBUTE LIST */}
                    <div className="w-full lg:flex-1">
                        {loading ? (
                            <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-12 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest relative">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                                Loading Attributes...
                            </div>
                        ) : attributes.length === 0 ? (
                            <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-12 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest relative">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300 rounded-t-sm"></div>
                                No attributes found. Create one to get started.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {attributes.map(attr => (
                                    <div key={attr.id} className="bg-white rounded-sm border border-gray-200 shadow-sm relative flex flex-col">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84]/80 rounded-t-sm"></div>

                                        <div className="p-4 md:p-5 flex flex-col flex-1">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#374151] mb-4">
                                                {attr.name}
                                            </h3>

                                            {/* Values List */}
                                            <div className="flex flex-wrap gap-2 mb-6 flex-1 items-start content-start">
                                                {attr.values && attr.values.length > 0 ? (
                                                    attr.values.map(val => (
                                                        <span key={val.id} className="bg-gray-50 border border-gray-200 px-2 py-1 rounded-sm text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                                            {val.value}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[11px] italic text-gray-400">No values configured</span>
                                                )}
                                            </div>

                                            {/* Add Value Input */}
                                            <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                                    placeholder="New value (e.g., Red)"
                                                    value={newValue[attr.id] || ''}
                                                    onChange={(e) => setNewValue({ ...newValue, [attr.id]: e.target.value })}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddValue(attr.id)}
                                                />
                                                <button
                                                    onClick={() => handleAddValue(attr.id)}
                                                    disabled={addingValueTo === attr.id || !newValue[attr.id]?.trim()}
                                                    className="bg-gray-100 hover:bg-gray-200 text-[#374151] border border-gray-200 disabled:opacity-50 px-3 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                                                >
                                                    {addingValueTo === attr.id ? "..." : "Add"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}