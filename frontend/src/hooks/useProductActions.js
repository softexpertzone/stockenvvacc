import { useState } from 'react';
import { apiFetch } from '@/lib/apiFetcher';
import { API_ENDPOINTS } from '@/config/apiEndpoints';

export const useProductActions = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const createProduct = async (data) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiFetch(API_ENDPOINTS.CATALOG.PRODUCTS, {
                method: 'POST',
                body: JSON.stringify(data),
            });

            if (response.error) throw new Error(response.error);

            return { success: true, data: response.data };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { createProduct, isLoading, error };
};