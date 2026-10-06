import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiFetcher';

export const useCatalog = () => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 1. Logic wrapped in useCallback to keep the dependency stable
    const fetchCategories = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('/api/catalog/categories');

            // Check if API call was successful and response is an array
            if (response.data && Array.isArray(response.data.data)) {
                setData(response.data.data);
                setError(null);
            } else {
                setError(response.error || "Failed to fetch data");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);
    const addCategory = async (category) => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Generate a robust unique code
            // We take the first 4 chars of the name + 2 random digits to ensure uniqueness
            const baseCode = category.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
            const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit random

            const payload = {
                ...category,
                // If category.code exists use it, otherwise generate a unique code
                code: category.code?.trim().toUpperCase() || `${baseCode}${randomSuffix}`
            };

            // 2. Perform the API call
            const response = await apiFetch('/api/catalog/categories', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            // 3. Handle Success
            // Check for both 2xx status codes and success flags
            if (response.status >= 200 && response.status < 300) {
                await fetchCategories(); // Refresh data
                return { success: true };
            }

            // 4. Handle API-level errors
            const errorMessage = response.error || response.message || "Failed to create category";
            setError(errorMessage);
            return { success: false, error: errorMessage };

        } catch (err) {
            // 5. Handle Network/Unexpected errors
            const msg = "An unexpected error occurred.";
            setError(msg);
            return { success: false, error: msg };
        } finally {
            setIsLoading(false);
        }
    };

    // 2. The useEffect now safely triggers an async wrapper
    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            if (isMounted) await fetchCategories();
        };

        init();
        return () => { isMounted = false; }; // Cleanup flag
    }, [fetchCategories]);

    return { data, isLoading, error, addCategory };
};