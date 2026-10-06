import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetcher';

export const useSales = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [buyers, setBuyers] = useState([]);
    const [products, setProducts] = useState([]);
    const [buyer, setBuyer] = useState(null);

    const [cart, setCart] = useState(() => [{
        id: Date.now(),
        productId: '',
        name: '',
        stock: 0,
        qty: 1,
        price: 0,
        discount: 0
    }]);

    useEffect(() => {
// Inside src/hooks/useSales.js

        const loadData = async () => {
            setLoading(true);

            // Call the API
            const result = await apiFetch('/inventory/products');

            // Check if result exists and handle the data structure safely
            if (result && !result.error) {
                // Look for the array in either:
                // 1. result.product (your original assumption)
                // 2. result (if the API returns the array directly)
                // 3. result.data (if your API wraps data)
                const productsList = result.product || (result.data ? result.data.product : result) || [];
                setProducts(Array.isArray(productsList) ? productsList : []);
            } else {
                console.warn("Product fetch failed or returned empty:", result?.error);
                setProducts([]);
            }

            setLoading(false);
        };
    }, []);

    const addRow = () => {
        setCart([...cart, {
            id: Date.now(),
            productId: '',
            name: '',
            stock: 0,
            qty: 1,
            price: 0,
            discount: 0
        }]);
    };

    const updateRow = (id, newData) => {
        setCart(cart.map(item => (item.id === id ? { ...item, ...newData } : item)));
    };

    const removeRow = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const processCheckout = async () => {
        if (!buyer) {
            alert("Please select a buyer.");
            return;
        }

        const isValidCart = cart.length > 0 && cart.every(item => item.productId && item.qty > 0);
        if (!isValidCart) {
            alert("Cart is empty or contains incomplete items.");
            return;
        }

        const total = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);

        setLoading(true);
        try {
            // Correct implementation of POST body for your apiFetch
            const result = await apiFetch('/sales/confirm', {
                method: 'POST',
                body: JSON.stringify({
                    buyerId: buyer.id,
                    items: cart,
                    total: total
                })
            });

            if (result.error) {
                throw new Error(result.error);
            }

            alert("Order confirmed successfully!");

            // Reset Cart
            setCart([{
                id: Date.now(),
                productId: '',
                name: '',
                stock: 0,
                qty: 1,
                price: 0,
                discount: 0
            }]);
            setBuyer(null);
        } catch (err) {
            console.error("Checkout error:", err);
            alert("Transaction failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        cart,
        buyer,
        setBuyer,
        buyers,
        products,
        addRow,
        updateRow,
        removeRow,
        processCheckout,
        loading,
        error
    };
};