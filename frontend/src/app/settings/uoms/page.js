'use client';
import { useState, useEffect } from 'react';

export default function UomSetupPage() {
    const [uoms, setUoms] = useState([]);
    const [formData, setFormData] = useState({ name: '', code: '' });

    // Added UI states for a smoother enterprise experience
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Helper to get Authorization header
    const getAuthHeaders = () => {
        // ⚠️ Change 'token' if your localStorage key is different
        // (check Application → Local Storage in DevTools)
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        };
    };

    // 1. Reusable load function
    const loadUoms = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/settings/uoms`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) {
                console.error('Failed to load UOMs:', res.status);
                return;
            }
            const data = await res.json();

            // 2. Functional update to satisfy linter state integrity
            setUoms((prev) => (Array.isArray(data) ? data : prev));
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Effect runs once on mount, using IIFE to handle async
    useEffect(() => {
        (async () => {
            await loadUoms();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 4. handleSave defined at top level
    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) return;

        try {
            setSaving(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/settings/uoms`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: formData.name.trim(),
                    symbol: formData.code.trim().toUpperCase() // UOM codes are generally uppercase
                })
            });

            if (response.ok) {
                setFormData({ name: '', code: '' });
                await loadUoms(); // Refresh the list
            } else {
                const errData = await response.json().catch(() => ({}));
                console.error("Save failed:", response.status, errData);
                alert(errData.error || errData.message || `Failed to create UOM (${response.status})`);
            }
        } catch (err) {
            console.error("Save error:", err);
            alert("Network error while saving UOM");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f9fafb] p-4 md:p-8 text-[#374151]">
            <div className="max-w-7xl mx-auto flex flex-col h-full gap-6">

                {/* HEADER */}
                <div>
                    <h1 className="text-2xl font-bold text-[#374151] tracking-tight uppercase">Units of Measure (UOM)</h1>
                    <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider text-[11px] font-semibold">
                        Configure standard measurement units for inventory tracking
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* LEFT PANEL: CREATE UOM FORM */}
                    <div className="w-full lg:w-1/3 bg-white rounded-sm border border-gray-200 shadow-sm relative flex-shrink-0 h-fit sticky top-6">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                        <div className="p-4 md:p-6">
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-5">
                                Register New UOM
                            </h2>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Unit Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Kilogram, Box, Pieces"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm outline-none bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Unit Code / Symbol *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. KG, BOX, PCS"
                                        value={formData.code}
                                        onChange={e => setFormData({...formData, code: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm outline-none bg-white uppercase focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                        required
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving || !formData.name.trim() || !formData.code.trim()}
                                        className="w-full bg-[#017E84] hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-sm text-sm transition-colors uppercase tracking-wider flex justify-center items-center"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Saving...
                                            </span>
                                        ) : "Add UOM"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT PANEL: UOM LIST (TABLE) */}
                    <div className="w-full lg:flex-1 bg-white rounded-sm border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] z-10"></div>

                        {loading ? (
                            <div className="p-12 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                Loading UOMs...
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full pt-1">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Code / Symbol</th>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {uoms.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-12 text-center text-gray-500 text-sm">
                                                No Units of Measure found.
                                            </td>
                                        </tr>
                                    ) : (
                                        uoms.map((u) => (
                                            <tr key={u.id} className="hover:bg-[#f9fafb] transition-colors">
                                                <td className="p-4 font-medium text-[#374151]">
                                                    {u.name}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-0.5 rounded-sm text-[11px] font-mono font-bold tracking-wide uppercase border bg-gray-50 text-gray-600 border-gray-200">
                                                        {u.symbol}
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