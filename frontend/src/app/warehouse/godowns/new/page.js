'use client';
import { useState } from 'react';

export default function NewGodownPage() {
    const [formData, setFormData] = useState({ name: '', address: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!formData.name || !formData.address) return alert("Please fill in both name and address.");

        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/warehouse/godowns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setFormData({ name: '', address: '' });
                alert("Godown registered successfully.");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to register Godown.");
            }
        } catch (err) {
            alert("Network error. Ensure backend is running on port 5000.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Register Godown</h1>
                    <p className="text-slate-500 text-sm mt-1">Define a new storage facility in your network.</p>
                </div>

                <div className="bg-white p-8 rounded border border-slate-200 shadow-sm space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Godown Name
                        </label>
                        <input
                            className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 focus:border-slate-800 outline-none transition"
                            placeholder="e.g. Central Warehouse A"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Address
                        </label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 focus:border-slate-800 outline-none transition"
                            rows="3"
                            placeholder="Full location address..."
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="bg-slate-800 hover:bg-slate-950 text-white font-medium px-6 py-2 rounded transition shadow-sm disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}