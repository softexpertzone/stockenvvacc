'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useRouter } from 'next/navigation';

export default function ModuleSettingsPage() {
    const router = useRouter();
    const [modules, setModules] = useState({
        accounts: false,
        inventory: true,
        purchase: true,
        sales: true,
        warehouse: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // ===== Only Super Admin can access this page =====
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user || user.role !== 'SUPER_ADMIN') {
            router.replace('/dashboard');
        }
    }, [router]);

    // Load current settings
    useEffect(() => {
        async function loadModules() {
            try {
                const res = await apiClient.get('/settings/modules');
                if (res.data?.success && res.data.data) {
                    setModules(res.data.data);
                }
            } catch (err) {
                console.error('Failed to load modules', err);
                setMessage('Failed to load module settings');
            } finally {
                setLoading(false);
            }
        }
        loadModules();
    }, []);

    const handleToggle = async (key) => {
        const updated = { ...modules, [key]: !modules[key] };
        setModules(updated);
        setSaving(true);
        setMessage('');

        try {
            const res = await apiClient.put('/settings/modules', updated);
            if (res.data?.success) {
                setMessage('Settings saved successfully!');
            } else {
                setMessage('Failed to save settings');
                setModules(modules); // revert
            }
        } catch (err) {
            console.error(err);
            setMessage('Error saving settings');
            setModules(modules); // revert
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <p className="text-gray-500">Loading module settings...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-2">Module Settings</h1>
            <p className="text-gray-500 mb-8">
                Enable or disable system modules. Only Super Admin should access this page.
            </p>

            {message && (
                <div
                    className={`mb-6 p-3 rounded ${
                        message.includes('success')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                >
                    {message}
                </div>
            )}

            <div className="space-y-4 bg-white border rounded-lg p-6 shadow-sm">
                {[
                    { key: 'accounts', label: 'Accounts / Finance Module' },
                    { key: 'inventory', label: 'Inventory Module' },
                    { key: 'purchase', label: 'Purchase Module' },
                    { key: 'sales', label: 'Sales Module' },
                    { key: 'warehouse', label: 'Warehouse Module' },
                ].map((item) => (
                    <div
                        key={item.key}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                        <span className="font-medium text-gray-800">{item.label}</span>
                        <button
                            onClick={() => handleToggle(item.key)}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                modules[item.key] ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    modules[item.key] ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                ))}
            </div>

            <p className="mt-6 text-sm text-gray-500">
                After enabling <strong>Accounts Module</strong>, refresh the page or re-login to see
                the Accounts section in the sidebar.
            </p>
        </div>
    );
}