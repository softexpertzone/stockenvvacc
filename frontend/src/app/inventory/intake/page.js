'use client';
import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetcher';

export default function IntakePage() {
    const [products, setProducts] = useState([]);
    const [intake, setIntake] = useState({
        productId: '',
        variantId: '',
        quantity: 0,
        rackLocation: '',
        vendorId: '',
        batchNumber: '', // Added for audit
        expiryDate: '',   // Added for quality control
        notes: ''         // Added for reference
    });

    // Fetch logic remains the same...
    useEffect(() => {
        apiFetch('/inventory/products').then(data => setProducts(Array.isArray(data) ? data : []));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiFetch('/inventory/intake', {
                method: 'POST',
                body: JSON.stringify(intake)
            });
            alert('Stock Ledger updated successfully.');
        } catch (err) {
            alert('Ledger commit failed: ' + err.message);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Advanced Stock Intake Desk</h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-2xl border shadow-sm">
                {/* Basic Info */}
                <div className="col-span-2">
                    <label className="block text-sm font-semibold mb-2">Target Product</label>
                    <select className="w-full p-4 border rounded-xl" onChange={(e) => setIntake({...intake, productId: e.target.value})}>
                        <option value="">Select Item from Catalog...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                {/* Quantities & Location */}
                <div>
                    <label className="block text-sm font-semibold mb-2">Quantity</label>
                    <input type="number" className="w-full p-4 border rounded-xl" onChange={(e) => setIntake({...intake, quantity: parseInt(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-2">Storage Rack</label>
                    <input className="w-full p-4 border rounded-xl" placeholder="e.g. WH-SEC-A1" onChange={(e) => setIntake({...intake, rackLocation: e.target.value})} />
                </div>

                {/* Audit Trail Fields */}
                <div>
                    <label className="block text-sm font-semibold mb-2">Batch/Lot #</label>
                    <input className="w-full p-4 border rounded-xl" onChange={(e) => setIntake({...intake, batchNumber: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-2">Expiry Date</label>
                    <input type="date" className="w-full p-4 border rounded-xl" onChange={(e) => setIntake({...intake, expiryDate: e.target.value})} />
                </div>

                <button type="submit" className="col-span-2 bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition">
                    Commit to Warehouse Ledger
                </button>
            </form>
        </div>
    );
}