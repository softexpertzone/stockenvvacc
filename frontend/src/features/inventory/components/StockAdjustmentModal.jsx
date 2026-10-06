'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetcher';

export default function StockAdjustmentModal({ isOpen, onClose, onSuccess }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        variantId: '',
        quantity: '',
        type: 'ADD',
        rackId: ''
    });

    // Fetch products when the modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchProducts = async () => {
                try {
                    const response = await apiFetch('/inventory/products');
                    // Ensure we handle the structure correctly
                    setProducts(response.data || []);
                } catch (err) {
                    console.error('Failed to load products:', err);
                }
            };
            fetchProducts();
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await apiFetch('/inventory/adjust', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // <--- Add this!
                },
                body: JSON.stringify(formData)
            });

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            alert('Adjustment failed: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Stock Adjustment</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl">×</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Product Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Variant</label>
                        <select
                            required
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            onChange={(e) => setFormData({...formData, variantId: e.target.value})}
                        >
                            <option value="">Select a product...</option>
                            {Array.isArray(products) && products.map(p => (
                                <optgroup key={p.id} label={p.name}>
                                    {(p.variants || []).map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.sku} - {v.name || 'Default Variant'}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* Adjustment Type Toggle */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, type: 'ADD'})}
                            className={`py-2.5 rounded-lg font-semibold border ${formData.type === 'ADD' ? 'bg-green-600 text-white border-green-700' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                        >
                            ADD (+)
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, type: 'REMOVE'})}
                            className={`py-2.5 rounded-lg font-semibold border ${formData.type === 'REMOVE' ? 'bg-red-600 text-white border-red-700' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                        >
                            REMOVE (-)
                        </button>
                    </div>

                    {/* Quantity Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity</label>
                        <input
                            type="number"
                            required
                            min="1"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        />
                    </div>

                    {/* Rack ID (Optional) */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Specific Rack ID (Optional)</label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Leave blank for auto-route"
                            onChange={(e) => setFormData({...formData, rackId: e.target.value})}
                        />
                        <p className="text-xs text-gray-500 mt-1">If left blank, the system will auto-route to the best available rack.</p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Processing...' : 'Confirm Adjustment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}