'use client';

import { useState, useEffect } from 'react';
import { groupApi } from '../api/groupApi';

function getInitialForm(data) {
    return {
        name: data?.name || '',
        code: data?.code || '',
        nature: data?.nature || 'ASSETS',
        type: data?.type || 'PRIMARY',
        parentId: data?.parentId || '',
        description: data?.description || '',
        sortOrder: data?.sortOrder || 0,
    };
}

export default function GroupForm({ initialData = null, onSuccess, onCancel }) {
    const [form, setForm] = useState(() => getInitialForm(initialData));
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load parent groups only once
    useEffect(() => {
        groupApi.getAll().then((res) => {
            setGroups(res.data?.data || res.data || []);
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                parentId: form.parentId || null,
            };
            if (initialData?.id) {
                await groupApi.update(initialData.id, payload);
            } else {
                await groupApi.create(payload);
            }
            onSuccess?.();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save group');
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
                    <label className="block text-sm font-medium mb-1">Nature *</label>
                    <select
                        value={form.nature}
                        onChange={(e) => setForm({ ...form, nature: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="ASSETS">Assets</option>
                        <option value="LIABILITIES">Liabilities</option>
                        <option value="EQUITY">Equity</option>
                        <option value="INCOME">Income</option>
                        <option value="EXPENSES">Expenses</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="PRIMARY">Primary</option>
                        <option value="SECONDARY">Secondary</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Parent Group</label>
                    <select
                        value={form.parentId}
                        onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="">None (Root)</option>
                        {groups
                            .filter((g) => g.id !== initialData?.id)
                            .map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Sort Order</label>
                    <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                    />
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
                    {loading ? 'Saving...' : initialData ? 'Update Group' : 'Create Group'}
                </button>
                <button type="button" onClick={onCancel} className="border px-5 py-2 rounded text-sm">
                    Cancel
                </button>
            </div>
        </form>
    );
}