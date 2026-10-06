'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const TYPE_OPTIONS = [
    { value: 'PURCHASE', label: 'Purchase' },
    { value: 'SALES', label: 'Sales / Customer' },
    { value: 'BOTH', label: 'Both' },
];

export default function ReturnReasonsPage() {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [form, setForm] = useState({
        code: '',
        name: '',
        type: 'PURCHASE',
        description: '',
        isActive: true,
    });

    const fetchReasons = useCallback(async (showSpinner = false) => {
        if (showSpinner) {
            setLoading(true);
        }
        setError(null);

        try {
            const res = await apiClient.get('/settings/return-reasons');
            const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setReasons(list);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                'Failed to load return reasons'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load – no setState before the async work starts
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await apiClient.get('/settings/return-reasons');
                if (cancelled) return;
                const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setReasons(list);
            } catch (err) {
                if (cancelled) return;
                setError(
                    err.response?.data?.error ||
                    err.response?.data?.message ||
                    err.message ||
                    'Failed to load return reasons'
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!form.code.trim() || !form.name.trim() || !form.type) {
            setError('Code, Name and Type are required');
            return;
        }

        try {
            setSaving(true);
            await apiClient.post('/settings/return-reasons', {
                code: form.code.trim().toUpperCase(),
                name: form.name.trim(),
                type: form.type.toUpperCase(),
                description: form.description?.trim() || null,
                isActive: form.isActive,
            });

            setSuccess(`Return reason "${form.code.toUpperCase()}" created successfully`);
            setForm({
                code: '',
                name: '',
                type: 'PURCHASE',
                description: '',
                isActive: true,
            });
            await fetchReasons(true);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                'Failed to create return reason'
            );
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            await apiClient.put(`/settings/return-reasons/${id}`, {
                isActive: !currentStatus,
            });
            await fetchReasons(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update status');
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Return Reasons (Admin)</h1>

            {/* ========== Create Form ========== */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Create New Return Reason</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 text-green-700 rounded border border-green-200">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="code"
                            value={form.code}
                            onChange={handleChange}
                            placeholder="e.g. DAMAGED"
                            className="w-full border rounded px-3 py-2 uppercase"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Stored in UPPERCASE</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="e.g. Damaged Goods"
                            className="w-full border rounded px-3 py-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="type"
                            value={form.type}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                            required
                        >
                            {TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                        <input
                            type="checkbox"
                            name="isActive"
                            checked={form.isActive}
                            onChange={handleChange}
                            id="isActive"
                        />
                        <label htmlFor="isActive" className="text-sm">
                            Active
                        </label>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={2}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Create Return Reason'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ========== List ========== */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Existing Return Reasons</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <LoadingSpinner />
                    </div>
                ) : reasons.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No return reasons yet. Create the first one above
                        (recommended first entry: code = <strong>DAMAGED</strong>).
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left px-4 py-3">Code</th>
                            <th className="text-left px-4 py-3">Name</th>
                            <th className="text-left px-4 py-3">Type</th>
                            <th className="text-left px-4 py-3">Description</th>
                            <th className="text-left px-4 py-3">Status</th>
                            <th className="text-left px-4 py-3">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {reasons.map((r) => (
                            <tr key={r.id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono font-medium">{r.code}</td>
                                <td className="px-4 py-3">{r.name}</td>
                                <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100">
                                            {r.type}
                                        </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {r.description || '—'}
                                </td>
                                <td className="px-4 py-3">
                                        <span
                                            className={`px-2 py-0.5 rounded text-xs ${
                                                r.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {r.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => toggleActive(r.id, r.isActive)}
                                        className="text-blue-600 hover:underline text-sm"
                                    >
                                        {r.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}