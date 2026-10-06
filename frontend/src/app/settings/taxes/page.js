// src/app/settings/taxes/page.js
'use client';
import { useState, useEffect } from 'react';

export default function TaxSetupPage() {
    const [taxes, setTaxes] = useState([]);
    const [formData, setFormData] = useState({ name: '', percentage: '' });

    // Added UI states for enterprise UX
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Helper to get Authorization header
    const getAuthHeaders = () => {
        // ⚠️ Change 'token' if your localStorage key is different
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        };
    };

    /**
     * Logic for fetching data.
     */
    const loadTaxes = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/settings/taxes`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) {
                console.error('Failed to load Taxes:', res.status);
                return;
            }
            const data = await res.json();

            setTaxes((prev) => (Array.isArray(data) ? data : prev));
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Effect runs once on mount
     */
    useEffect(() => {
        (async () => {
            await loadTaxes();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.percentage) return;

        try {
            setSaving(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/settings/taxes`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: formData.name.trim(),
                    percentage: Number(formData.percentage)
                })
            });

            if (response.ok) {
                setFormData({ name: '', percentage: '' });
                await loadTaxes();
            } else {
                const errData = await response.json().catch(() => ({}));
                console.error("Save failed:", response.status, errData);
                alert(errData.error || errData.message || `Failed to create Tax (${response.status})`);
            }
        } catch (err) {
            console.error("Save error:", err);
            alert("Network error while saving Tax");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f9fafb] p-4 md:p-8 text-[#374151]">
            <div className="max-w-7xl mx-auto flex flex-col h-full gap-6">

                {/* HEADER */}
                <div>
                    <h1 className="text-2xl font-bold text-[#374151] tracking-tight uppercase">Tax Setup</h1>
                    <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider text-[11px] font-semibold">
                        Configure system-wide tax rates and rules
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* LEFT PANEL: CREATE TAX FORM */}
                    <div className="w-full lg:w-1/3 bg-white rounded-sm border border-gray-200 shadow-sm relative flex-shrink-0 h-fit sticky top-6">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                        <div className="p-4 md:p-6">
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-5">
                                Add New Tax Rule
                            </h2>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Tax Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. VAT, GST, Sales Tax"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm outline-none bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Rate (%) *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g. 15"
                                            value={formData.percentage}
                                            onChange={e => setFormData({...formData, percentage: e.target.value})}
                                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-sm text-sm outline-none bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                            required
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 text-sm">
                                            %
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving || !formData.name.trim() || !formData.percentage}
                                        className="w-full bg-[#017E84] hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-sm text-sm transition-colors uppercase tracking-wider flex justify-center items-center"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Saving...
                                            </span>
                                        ) : "Add Tax Rule"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT PANEL: TAX LIST (TABLE) */}
                    <div className="w-full lg:flex-1 bg-white rounded-sm border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] z-10"></div>

                        {loading ? (
                            <div className="p-12 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                Loading Tax Rules...
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full pt-1">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tax Name</th>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Rate</th>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {taxes.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-12 text-center text-gray-500 text-sm">
                                                No tax rules found.
                                            </td>
                                        </tr>
                                    ) : (
                                        taxes.map((t) => (
                                            <tr key={t.id} className="hover:bg-[#f9fafb] transition-colors">
                                                <td className="p-4 font-medium text-[#374151]">
                                                    {t.name}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="px-2 py-0.5 rounded-sm text-[12px] font-mono font-bold tracking-wide border bg-blue-50 text-blue-700 border-blue-200">
                                                        {Number(t.percentage).toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wide uppercase border bg-green-50 text-green-700 border-green-200">
                                                        Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}