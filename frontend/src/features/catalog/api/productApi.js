import { apiFetch } from '@/lib/apiFetcher';
import { API_ENDPOINTS } from '@/config/apiEndpoints';

export const productApi = {
    async register(payload) {
        return await apiFetch(API_ENDPOINTS.CATALOG.PRODUCTS, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async fetchMetaData() {
        // Removed the 6th endpoint to fix the 404 network error.
        // Node/Prisma returns attributes along with their child values in item 4.
        const results = await Promise.allSettled([
            apiFetch('/api/catalog/categories'),
            apiFetch('/api/settings/uoms'),
            apiFetch('/api/partners'),
            apiFetch('/api/settings/taxes'),
            apiFetch('/api/settings/attributes')
        ]);

        /**
         * Defensive Extractor Utility
         * Handles direct arrays, standard object wrappers, and deep nesting perfectly
         */
        const extract = (index) => {
            const res = results[index];
            if (res.status === 'fulfilled' && res.value) {
                const val = res.value;
                if (Array.isArray(val)) return val;
                if (Array.isArray(val.data)) return val.data;
                if (val.data && Array.isArray(val.data.data)) return val.data.data;

                // Fallback for custom named object keys coming from your controllers
                const fallback = val.categories || val.attributes || val.uoms || val.taxes || val.partners || val.data;
                if (Array.isArray(fallback)) return fallback;
            }
            return [];
        };

        return {
            categories: extract(0),
            uoms: extract(1),
            partners: extract(2),
            taxes: extract(3),
            attributes: extract(4) // This contains both the definition and its nested choices
        };
    }
};