import { useState, useEffect } from 'react';
import axios from 'axios';

export const useCatalog = () => {
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAttributes = async () => {
            try {
                setLoading(true);
                // Ensure your axios baseURL is set to your backend URL (e.g., http://localhost:5000)
                const res = await axios.get('/api/catalog/attributes/definitions');
                setAttributes(res.data.data);
            } catch (err) {
                console.error("Failed to fetch attributes", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAttributes();
    }, []);

    return { attributes, loading, error };
};