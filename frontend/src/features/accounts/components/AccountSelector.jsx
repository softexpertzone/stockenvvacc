'use client';

import { useEffect, useState } from 'react';
import { ledgerApi } from '../api/ledgerApi';

export default function AccountSelector({ value, onChange, placeholder = 'Select Account' }) {
    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await ledgerApi.getAll({ limit: 500, isActive: true });
                // Backend: { success, message, data: { data: [...], pagination } }
                const list = res?.data?.data?.data ?? [];
                setLedgers(Array.isArray(list) ? list : []);
            } catch (err) {
                console.error('Failed to load ledgers:', err?.response?.data || err.message);
                setLedgers([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="relative">
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={loading}
                className={`
                    w-full appearance-none
                    border border-gray-300 rounded-md
                    px-3 py-2 pr-9
                    text-sm text-gray-800
                    bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
                    transition-colors
                `}
            >
                <option value="" className="text-gray-500">
                    {loading ? 'Loading accounts...' : placeholder}
                </option>
                {ledgers.map((ledger) => (
                    <option key={ledger.id} value={ledger.id} className="text-gray-800">
                        {ledger.code} - {ledger.name}
                    </option>
                ))}
            </select>

            {/* Custom dropdown arrow (Odoo / SAP style) */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                {loading ? (
                    <svg
                        className="animate-spin h-4 w-4 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                ) : (
                    <svg
                        className="h-4 w-4 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </div>
        </div>
    );
}