'use client';
import React, { useState, useMemo } from 'react';

export default function PurchaseItemModal({ isOpen, onClose, onAddItem, products }) {
    // 1. ALL HOOKS MUST BE DECLARED FIRST
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = useMemo(() => {
        const cats = products.map(p => p.category?.name || 'Uncategorized');
        return ['All', ...new Set(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const name = (p.name || p.product?.name || "").toLowerCase();
            const sku = (p.sku || "").toLowerCase();
            const cat = (p.category?.name || 'Uncategorized');

            const matchesSearch = name.includes(searchTerm.toLowerCase()) || sku.includes(searchTerm.toLowerCase());
            const matchesCat = selectedCategory === 'All' || cat === selectedCategory;

            return matchesSearch && matchesCat;
        });
    }, [products, searchTerm, selectedCategory]);

    // 2. NOW you can return early if not open
    if (!isOpen) return null;

    // 3. JSX RENDER LOGIC
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Select Product</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="Search name/SKU..."
                        className="w-full p-2 border rounded-lg text-sm"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="p-2 border rounded-lg text-sm"
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                    {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => {
                                onAddItem(p);
                                onClose();
                            }}
                            className="w-full text-left p-3 hover:bg-blue-50 rounded-xl border border-gray-100 transition-all"
                        >
                            <div className="font-semibold text-gray-900 text-sm">{p.name || p.product?.name}</div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-gray-500 font-mono">{p.sku || 'N/A'}</span>
                                <span className="text-xs font-bold text-blue-600">৳{Number(p.price || 0).toFixed(2)}</span>
                            </div>
                        </button>
                    )) : (
                        <div className="text-center py-8 text-gray-500 text-sm italic">
                            No products found matching your search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}