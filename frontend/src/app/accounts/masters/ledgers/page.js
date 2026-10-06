/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { ledgerApi } from '@/features/accounts/api/ledgerApi';
import LedgerForm from '@/features/accounts/components/LedgerForm';

export default function LedgersPage() {
    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editData, setEditData] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await ledgerApi.getAll({ limit: 200 });
            const list = res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? [];
            setLedgers(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error('Failed to load ledgers:', err?.response?.data || err.message);
            setLedgers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSuccess = () => {
        setShowForm(false);
        setEditData(null);
        setLoading(true);
        load();
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Account Ledgers</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Chart of accounts · {Array.isArray(ledgers) ? ledgers.length : 0} ledgers
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditData(null);
                            setShowForm(true);
                        }}
                        className="inline-flex items-center gap-2 bg-[#714B67] hover:bg-[#5a3c53] text-white px-4 py-2 rounded text-sm font-medium shadow-sm transition-colors"
                    >
                        <span className="text-lg leading-none">+</span>
                        New Ledger
                    </button>
                </div>
            </div>

            <div className="p-6">
                {/* Form */}
                {showForm && (
                    <div className="mb-6 bg-white border border-gray-200 rounded shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-800">
                                {editData ? 'Edit Ledger' : 'Create Ledger'}
                            </h2>
                        </div>
                        <div className="p-4">
                            <LedgerForm
                                key={editData?.id ?? 'new'}
                                initialData={editData}
                                onSuccess={handleSuccess}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditData(null);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="px-6 py-12 text-center text-gray-500 text-sm">
                            Loading ledgers…
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Group</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 text-right">Opening Balance</th>
                                    <th className="px-4 py-3 text-right">Current Balance</th>
                                    <th className="px-4 py-3 w-24">Action</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {(Array.isArray(ledgers) ? ledgers : []).length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                                            No ledgers found. Create one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    (Array.isArray(ledgers) ? ledgers : []).map((l) => (
                                        <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2.5 font-mono text-gray-800">{l.code}</td>
                                            <td className="px-4 py-2.5 font-medium text-gray-900">{l.name}</td>
                                            <td className="px-4 py-2.5 text-gray-700">{l.group?.name || '—'}</td>
                                            <td className="px-4 py-2.5">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {l.ledgerType || '—'}
                          </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">
                                                {Number(l.openingBalance || 0).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-medium text-gray-900 tabular-nums">
                                                {Number(l.currentBalance || 0).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <button
                                                    onClick={() => {
                                                        setEditData(l);
                                                        setShowForm(true);
                                                    }}
                                                    className="text-[#714B67] hover:text-[#5a3c53] text-sm font-medium hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}