'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../../../lib/apiFetcher';

// Helper function to extract array anywhere in the API response object
const extractArrayFromResponse = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;

    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.products)) return response.products;
    if (Array.isArray(response.items)) return response.items;

    if (response.data && typeof response.data === 'object') {
        for (const key in response.data) {
            if (Array.isArray(response.data[key])) return response.data[key];
        }
    }

    if (typeof response === 'object') {
        for (const key in response) {
            if (Array.isArray(response[key])) return response[key];
        }
    }

    return [];
};

export const useSales = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [buyers, setBuyers] = useState([]);
    const [products, setProducts] = useState([]);

    // Cart state with fallback initialization
    const [cart, setCart] = useState(() => [{
        id: Date.now().toString(),
        productVariantId: '',
        name: '',
        qty: 1,
        price: 0,
        discount: 0
    }]);

    // Initial Data Fetcher
    const loadInitialData = useCallback(async () => {
        setError(null);
        try {
            let prodResult;
            try {
                prodResult = await apiFetch('/sales/products-with-stock');
                if (prodResult?.error || prodResult?.success === false) {
                    throw new Error(prodResult.error || "Primary fetch failed");
                }
            } catch (e) {
                prodResult = await apiFetch('/inventory/products');
            }

            const custResult = await apiFetch('/sales/customers');
            let rawProducts = extractArrayFromResponse(prodResult);

            if (rawProducts.length === 0) {
                if (prodResult?.error) throw new Error(prodResult.error);
            }

            // Normalize product catalog
            const normalizedProducts = rawProducts.map(prod => {
                if (prod.variants && Array.isArray(prod.variants) && prod.variants.length > 0) {
                    return prod;
                }
                return {
                    id: prod.id || Math.random().toString(),
                    name: prod.name || prod.productName || "Unnamed Product",
                    variants: [{
                        id: prod.id || Math.random().toString(),
                        sku: prod.sku || "N/A",
                        price: Number(prod.price || prod.sellingPrice || 0),
                        totalAvailable: Number(prod.totalAvailable ?? prod.stock ?? prod.quantity ?? 0),
                        warehouses: prod.warehouses || []
                    }]
                };
            });

            setProducts(normalizedProducts);

            let rawCustomers = extractArrayFromResponse(custResult);
            setBuyers(rawCustomers);

        } catch (err) {
            setError(err.message || 'Failed to load data from store');
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const initFetch = async () => {
            if (isMounted) setLoading(true);
            await loadInitialData();
            if (isMounted) setLoading(false);
        };
        initFetch();
        return () => { isMounted = false; };
    }, [loadInitialData]);

    // Extract unique Godowns/Warehouses for UI selection
    const godowns = useMemo(() => {
        const gMap = {};
        products.forEach(p => {
            p.variants?.forEach(v => {
                v.warehouses?.forEach(w => {
                    if (w.godownId) {
                        gMap[w.godownId] = w.godownName;
                    }
                });
            });
        });
        return Object.keys(gMap).map(id => ({ id, name: gMap[id] }));
    }, [products]);

    // --- Cart Actions ---
    const addRow = () => {
        setCart(prev => [...prev, {
            id: Date.now().toString(),
            productVariantId: '',
            name: '',
            qty: 1,
            price: 0,
            discount: 0
        }]);
    };

    const updateRow = (id, newData) => {
        setCart(prev =>
            prev.map(item => item.id === id ? { ...item, ...newData } : item)
        );
    };

    const removeRow = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = () => {
        setCart([{
            id: Date.now().toString(),
            productVariantId: '',
            name: '',
            qty: 1,
            price: 0,
            discount: 0
        }]);
    };

    // --- Checkout Process ---
    const processCheckout = async (checkoutPayload) => {
        setLoading(true);
        setError(null);

        try {
            // Pick items passed in payload or fallback to cart state
            const sourceItems = checkoutPayload.items && checkoutPayload.items.length > 0
                ? checkoutPayload.items
                : cart;

            const formattedItems = sourceItems.map(item => ({
                productVariantId: item.productVariantId || item.productId || item.variantId,
                orderedQuantity: Number(item.orderedQuantity ?? item.qty ?? 1),
                unitPrice: Number(item.unitPrice ?? item.price ?? 0)
            }));

            // Financial Calculations
            const subtotal = formattedItems.reduce(
                (sum, item) => sum + (item.orderedQuantity * item.unitPrice),
                0
            );

            const courierCost = Number(checkoutPayload.courierCost ?? checkoutPayload.shippingCost ?? 0);
            const taxAmount = Number(checkoutPayload.taxAmount ?? 0);
            const taxRate = Number(checkoutPayload.taxRate ?? 0);
            const receivedAmount = Number(
                checkoutPayload.receivedAmount ?? checkoutPayload.paidAmount ?? checkoutPayload.advancePaid ?? 0
            );

            const totalAmount = Number(
                checkoutPayload.totalAmount ?? (subtotal + courierCost + taxAmount)
            );

            const balanceDue = Number(
                checkoutPayload.balanceDue ?? Math.max(0, totalAmount - receivedAmount)
            );

            // Construct payload strictly matching salesController expects
            const body = {
                customerId: checkoutPayload.buyerId || checkoutPayload.customerId || checkoutPayload.partnerId,
                partnerId: checkoutPayload.buyerId || checkoutPayload.partnerId || checkoutPayload.customerId,
                godownId: checkoutPayload.godownId || undefined,

                // Exact database column mappings
                courierCost,
                taxAmount,
                taxRate,
                receivedAmount,
                totalAmount,
                balanceDue,

                paymentMethod: checkoutPayload.paymentMethod || 'CASH',
                paymentStatus: checkoutPayload.paymentStatus || (balanceDue === 0 ? 'PAID' : 'PARTIAL'),
                notes: checkoutPayload.notes || '',
                items: formattedItems
            };

            const result = await apiFetch('/sales/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (result.error || result.success === false) {
                throw new Error(result.error || 'Checkout failed');
            }

            // Automatically refresh inventory stock counts on completion
            await loadInitialData();

            return result;
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err.message || 'Checkout failed');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        cart,
        buyers,
        products,
        godowns,
        addRow,
        updateRow,
        removeRow,
        clearCart,
        processCheckout,
        loading,
        error,
        refreshData: loadInitialData
    };
};