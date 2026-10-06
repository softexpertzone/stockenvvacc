'use client';

import { useState, useRef } from 'react';
import { Package, ArrowRight, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';

export default function SmartPutawayPage() {
    // --- State Management ---
    const [skuName, setSkuName] = useState('');
    const [totalWeight, setTotalWeight] = useState('');
    const [inboundItems, setInboundItems] = useState([]);
    const [isCalculating, setIsCalculating] = useState(false);

    // Create a ref to auto-focus the input box
    const skuInputRef = useRef(null);

    const API_BASE = 'http://localhost:5000/api';

    // --- Actions ---
    // Add this new function to your component
    const confirmPlacement = async (item) => {
        try {
            const res = await fetch(`${API_BASE}/warehouse/bins/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    variantName: item.skuName,
                    binId: item.suggestedBin.id,
                    weight: item.totalWeight
                }),
            });

            if (res.ok) {
                alert(`Confirmed: ${item.skuName} placed in ${item.suggestedBin.name}`);
                setInboundItems(inboundItems.filter(i => i.id !== item.id)); // Remove from list
            }
        } catch (err) {
            console.error("Confirmation failed", err);
        }
    };
    const handleAddItem = (e) => {
        e.preventDefault();
        if (!skuName || !totalWeight) return;

        const newItem = {
            id: Date.now().toString(),
            skuName,
            totalWeight: parseFloat(totalWeight),
            status: 'pending',
            suggestedBin: null,
            error: null
        };

        setInboundItems([...inboundItems, newItem]);

        // Reset form for next item
        setSkuName('');
        setTotalWeight('');

        // AUTO-FOCUS: Returns cursor to the SKU box immediately for next entry
        if (skuInputRef.current) {
            skuInputRef.current.focus();
        }
    };

    const handleRemoveItem = (id) => {
        setInboundItems(inboundItems.filter(item => item.id !== id));
    };

    const handleRunSmartAllocation = async () => {
        setIsCalculating(true);
        const updatedItems = [...inboundItems];

        for (let i = 0; i < updatedItems.length; i++) {
            const item = updatedItems[i];
            if (item.status === 'success') continue;

            updatedItems[i].status = 'calculating';
            setInboundItems([...updatedItems]);

            try {
                const res = await fetch(`${API_BASE}/warehouse/bins/suggest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ weight: item.totalWeight }),
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    updatedItems[i].status = 'success';
                    updatedItems[i].suggestedBin = data.data;
                } else {
                    updatedItems[i].status = 'failed';
                    updatedItems[i].error = data.message || "No bin found.";
                }
            } catch (err) {
                updatedItems[i].status = 'failed';
                updatedItems[i].error = "Network error.";
            }
            setInboundItems([...updatedItems]);
        }
        setIsCalculating(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-xl font-bold text-slate-900 mb-6">Manual Inbound Entry</h1>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Entry Form */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
                                <input
                                    ref={skuInputRef} // Attached ref here
                                    type="text"
                                    required
                                    autoFocus // Starts with cursor in this box
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 outline-none focus:border-slate-800"
                                    value={skuName}
                                    onChange={(e) => setSkuName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Weight (kg)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 outline-none focus:border-slate-800"
                                    value={totalWeight}
                                    onChange={(e) => setTotalWeight(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-slate-800 text-white font-medium py-2 rounded shadow-sm hover:bg-slate-950"
                            >
                                Add to List
                            </button>
                        </form>
                    </div>

                    {/* Manifest Table */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-slate-500 uppercase">Pending Manifest</h2>
                            <button
                                onClick={handleRunSmartAllocation}
                                disabled={isCalculating || inboundItems.length === 0}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:bg-blue-300"
                            >
                                {isCalculating ? 'Allocating...' : 'Run Allocation'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {inboundItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded">
                                    <div>
                                        <div className="font-medium text-slate-800">{item.skuName}</div>
                                        <div className="text-xs text-slate-500">{item.totalWeight} kg</div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* 1. If Allocation was Successful: Show Confirm Button */}
                                        {item.status === 'success' ? (
                                            <button
                                                onClick={() => confirmPlacement(item)}
                                                className="text-xs font-bold text-white bg-green-600 px-3 py-1 rounded hover:bg-green-700 shadow-sm transition"
                                            >
                                                Confirm: {item.suggestedBin.name}
                                            </button>
                                        ) : item.status === 'calculating' ? (
                                            /* 2. If Still Calculating: Show Loader */
                                            <Loader2 size={16} className="animate-spin text-blue-500" />
                                        ) : (
                                            /* 3. If Pending/Failed: Show Trash Icon */
                                            <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-500 transition">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}