import { useState, useEffect, useCallback, useRef } from 'react';

export const useInventory = () => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // 1. The data-fetching logic is kept separate
    const performFetch = useCallback(async () => {
        const response = await fetch('http://localhost:5000/api/inventory/products'); // Added /products
        if (!response.ok) throw new Error('Failed to fetch inventory');
        return await response.json();
    }, []);

    // 2. The core action wrapper
    const fetchInventory = useCallback(async () => {
        try {
            const result = await performFetch();
            if (isMounted.current) {
                setData(result.data || []);
                setIsLoading(false);
            }
        } catch (err) {
            if (isMounted.current) {
                setError(err.message);
                setIsLoading(false);
            }
        }
    }, [performFetch]);

    // 3. The trigger effect
// Replace your existing useEffect (3) with this:
    useEffect(() => {
        let active = true;

        const loadData = async () => {
            setIsLoading(true);
            try {
                const result = await performFetch();
                if (active) {
                    setData(result.data || []);
                    setError(null);
                }
            } catch (err) {
                if (active) setError(err.message);
            } finally {
                if (active) setIsLoading(false);
            }
        };

        loadData();
        return () => { active = false; };
    }, [performFetch]);

    // 4. Transactional moveStock
    const moveStock = useCallback(async (payload) => {
        try {
            const response = await fetch('http://localhost:5000/api/inventory/adjust', { // Changed to /adjust
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Update failed');
            await fetchInventory();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [fetchInventory]);

    return { data, isLoading, error, moveStock, refetch: fetchInventory };
};