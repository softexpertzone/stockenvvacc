'use client';

import React, { useState, useMemo } from 'react';

export default function SalesItemModal({
                                           isOpen,
                                           onClose,
                                           onAddItem,
                                           products = [],
                                           selectedGodownId,
                                       }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const flatVariants = useMemo(() => {
        if (!Array.isArray(products)) return [];

        const list = [];
        for (const prod of products) {
            const variants = prod.variants || prod.productVariants || [];
            if (!Array.isArray(variants) || variants.length === 0) continue;

            for (const v of variants) {
                let stock = v.totalAvailable ?? v.availableQty ?? 0;

                if (selectedGodownId) {
                    const wh = v.warehouses?.find(
                        (w) => String(w.godownId) === String(selectedGodownId)
                    );
                    stock = wh ? (wh.availableQty ?? 0) : 0;
                }

                list.push({
                    id: v.id,
                    sku: v.sku || 'NO-SKU',
                    productName: prod.name || 'Unnamed Product',
                    variantName: v.name && v.name !== prod.name ? v.name : '',
                    price: Number(
                        v.price ?? v.sellingPrice ?? prod.price ?? prod.sellingPrice ?? 0
                    ),
                    stock,
                    category: prod.category?.name || 'Uncategorized',
                    rawVariant: v,
                    rawProduct: prod,
                });
            }
        }
        return list;
    }, [products, selectedGodownId]);

    const categories = useMemo(() => {
        const cats = flatVariants.map((p) => p.category);
        return ['All', ...new Set(cats)];
    }, [flatVariants]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return flatVariants.filter((p) => {
            const name = `${p.productName} ${p.variantName}`.toLowerCase();
            const sku = (p.sku || '').toLowerCase();
            const matchesSearch = !term || name.includes(term) || sku.includes(term);
            const matchesCat =
                selectedCategory === 'All' || p.category === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [flatVariants, searchTerm, selectedCategory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            {/* Modal Container - Odoo/SAP style */}
            <div className="bg-white w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-sm border border-gray-300">

                {/* Header */}
                <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-base text-gray-800 tracking-tight">
                        Select Product
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition"
                    >
                        ×
                    </button>
                </div>

                {/* Search + Category */}
                <div className="flex gap-3 p-4 border-b border-gray-200 bg-white">
                    <input
                        type="text"
                        placeholder="Search name or SKU..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    <select
                        className="px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Product List */}
                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 text-sm">
                            {products.length === 0
                                ? 'No products loaded from server'
                                : 'No products match your search'}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filtered.map((p) => {
                                const isOutOfStock = p.stock <= 0;
                                return (
                                    <button
                                        key={p.id}
                                        disabled={isOutOfStock}
                                        onClick={() => {
                                            if (!isOutOfStock) {
                                                onAddItem(p);
                                                onClose(); // ← Close modal after selecting
                                            }
                                        }}
                                        className={`w-full text-left px-5 py-3.5 transition-colors ${
                                            isOutOfStock
                                                ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                                                : 'hover:bg-teal-50/70'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 text-sm">
                                                    {p.productName}
                                                    {p.variantName && (
                                                        <span className="text-gray-500 font-normal">
                                                            {' '}({p.variantName})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                        {p.sku}
                                                    </span>
                                                    <span
                                                        className={
                                                            isOutOfStock
                                                                ? 'text-red-600 font-medium'
                                                                : 'text-emerald-700 font-medium'
                                                        }
                                                    >
                                                        Stock: {p.stock}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="font-bold text-[#017E84] text-sm whitespace-nowrap">
                                                ৳{p.price.toFixed(2)}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium border border-gray-300 rounded-sm bg-white hover:bg-gray-100 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}