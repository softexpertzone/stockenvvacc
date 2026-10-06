'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient'; // adjust if your path is different

export function useCompanyModules() {
    const [modules, setModules] = useState({
        inventory: true,
        accounts: false,
        hr: false,
        payroll: false,
        attendance: false,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchModules() {
            try {
                const res = await apiClient.get('/settings/modules');
                if (res.data?.success) {
                    setModules(res.data.data);
                }
            } catch (err) {
                console.error('Failed to load modules', err);
            } finally {
                setLoading(false);
            }
        }

        fetchModules();
    }, []);

    return { modules, loading };
}