'use client';

import { useState, useEffect } from 'react';
import { ledgerApi } from '../api/ledgerApi';
import { groupApi } from '../api/groupApi';

export default function LedgerForm({ initialData = null, onSuccess, onCancel }) {
    const [form, setForm] = useState({
        name: '',
        code: '',
        groupId: '',
        ledgerType: 'GENERAL',
        openingBalance: 0,
        isDebitBalance: true,
        description: '',
    });
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                code: initialData.code || '',
                groupId: initialData.groupId || '',
                ledgerType: initialData.ledgerType || 'GENERAL',
                openingBalance: initialData.openingBalance || 0,
                isDebitBalance: initialData.isDebitBalance ?? true,
                description: initialData.description || '',
            });
        }
    }, [initialData]);

    useEffect(() => {
        groupApi.getAll().then((res) => {
            setGroups(res.data?.data || res.data || []);
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData?.id) {
                await ledgerApi.update(initialData.id, form);
            } else {
                await ledgerApi.create(form);
            }
            onSuccess?.();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save ledger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Code *</label>
                    <input
                        type="text"
                        required
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Account Group *</label>
                    <select
                        required
                        value={form.groupId}
                        onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="">Select Group</option>
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name} ({g.nature})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Ledger Type</label>
                    <select
                        value={form.ledgerType}
                        onChange={(e) => setForm({ ...form, ledgerType: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="GENERAL">General</option>
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank</option>
                        <option value="CUSTOMER">Customer</option>
                        <option value="VENDOR">Vendor</option>
                        <option value="TAX">Tax</option>
                        <option value="STOCK">Stock</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Opening Balance</label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.openingBalance}
                        onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Balance Nature</label>
                    <select
                        value={form.isDebitBalance ? 'debit' : 'credit'}
                        onChange={(e) => setForm({ ...form, isDebitBalance: e.target.value === 'debit' })}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="debit">Debit Balance</option>
                        <option value="credit">Credit Balance</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-5 py-2 rounded text-sm disabled:opacity-50"
                >
                    {loading ? 'Saving...' : initialData ? 'Update Ledger' : 'Create Ledger'}
                </button>
                <button type="button" onClick={onCancel} className="border px-5 py-2 rounded text-sm">
                    Cancel
                </button>
            </div>
        </form>
    );
}