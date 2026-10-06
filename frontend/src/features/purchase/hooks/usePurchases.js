import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/apiFetcher';

export const usePurchases = () => {
    // 1. State Definitions
    const [cart, setCart] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);

    // 2. Fetch vendors on mount
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const response = await apiFetch('/api/partners?type=VENDOR');
                // Ensure data extraction handles common API response structures
                const data = response?.data?.data || response?.data || [];
                setSuppliers(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to load vendors:", error);
                setSuppliers([]);
            }
        };
        fetchSuppliers();
    }, []);

    // 3. Add product with validation
    const addRow = (product) => {
        const hasValidVariant = product.productVariants && product.productVariants.length > 0;

        if (!hasValidVariant) {
            alert(`Cannot add "${product.name}": Missing variant details.`);
            return;
        }

        const existingItemIndex = cart.findIndex(item => item.id === product.id);

        if (existingItemIndex >= 0) {
            const newCart = [...cart];
            newCart[existingItemIndex].qty += 1;
            setCart(newCart);
            return;
        }

        const firstVariant = product.productVariants[0];
        const unitPrice = product.purchasePrice || firstVariant.purchasePrice || product.price || firstVariant.price || 0;

        setCart([...cart, {
            ...product,
            id: product.id,
            qty: 1,
            price: Number(unitPrice),
            variantId: firstVariant.id
        }]);
    };

    // 4. Update row (e.g., quantity change)
    const updateRow = (id, updates) => {
        setCart(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    // 5. Remove row
    const removeRow = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    // 6. API Interaction
    const processPurchase = async (orderData) => {
        setLoading(true);
        try {
            const response = await apiFetch('/api/purchase/', {
                method: 'POST',
                body: JSON.stringify(orderData),
            });

            // Explicitly surface API errors
            if (response.error || response.status >= 400) {
                throw new Error(response.error || `Request failed with status ${response.status}`);
            }

            return response;          // { data, error: null, status: 201 }
        } catch (error) {
            console.error("Purchase processing error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // 7. Return everything needed by the UI
    return {
        cart,
        setCart,
        suppliers,
        loading,
        addRow,
        updateRow,
        removeRow,
        processPurchase
    };
};