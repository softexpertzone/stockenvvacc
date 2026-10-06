'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export default function ProductPicker({ value, onChange, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Get stock from productVariants
    const getStock = (p) => {
        if (!p) return 0;
        // Stock is inside productVariants array
        if (Array.isArray(p.productVariants) && p.productVariants.length > 0) {
            return p.productVariants[0].currentStock ?? 0;
        }
        return p.currentStock ?? p.stock ?? 0;
    };

    // Get product name
    const getName = (p) => {
        return p?.name || p?.productName || p?.sku || 'Unnamed product';
    };

    // Get price from variant
    const getPrice = (p) => {
        if (Array.isArray(p.productVariants) && p.productVariants.length > 0) {
            return p.productVariants[0].price;
        }
        return p.price;
    };

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;

        const loadProducts = async () => {
            setLoading(true);
            setError('');
            try {
                // CORRECT ENDPOINT
                const res = await apiClient.get('/api/catalog/products');
                const list = res.data?.data || res.data || [];

                if (isMounted) {
                    setProducts(Array.isArray(list) ? list : []);
                    console.log('Products loaded:', list);
                }
            } catch (err) {
                console.error('Failed to load products:', err);
                if (isMounted) {
                    setProducts([]);
                    setError('Failed to load products');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadProducts();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    const filteredProducts = (Array.isArray(products) ? products : []).filter((p) => {
        const name = getName(p).toLowerCase();
        const brand = (p.brand?.name || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return name.includes(term) || brand.includes(term);
    });

    const handleSelect = (product) => {
        // Also attach the first variant for easier use later
        const selected = {
            ...product,
            currentStock: getStock(product),
            price: getPrice(product),
            variantId: product.productVariants?.[0]?.id,
        };
        onSelect?.(selected);
        onChange?.(selected);
        setIsOpen(false);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full text-left p-3 border border-gray-300 rounded-xl bg-white hover:border-blue-500 transition text-sm text-gray-900"
            >
                {value ? getName(value) : 'Click to select product...'}
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Select Product</h2>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                                Close
                            </button>
                        </div>

                        <input
                            placeholder="Search by name or brand..."
                            className="w-full border border-gray-300 p-3 rounded-xl mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <p className="text-center text-gray-500 py-8">Loading products...</p>
                            ) : error ? (
                                <p className="text-center text-red-500 py-8">{error}</p>
                            ) : filteredProducts.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No products found</p>
                            ) : (
                                filteredProducts.map((product, index) => (
                                    <div
                                        key={product.id || `product-${index}`}
                                        onClick={() => handleSelect(product)}
                                        className="p-4 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {getName(product)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                SKU: {product.sku} | Stock: {getStock(product)}
                                            </p>
                                        </div>
                                        <span className="font-bold text-blue-600">
                                            {getPrice(product) != null ? `$${getPrice(product)}` : ''}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}