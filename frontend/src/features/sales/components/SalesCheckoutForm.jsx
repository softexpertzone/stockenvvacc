'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetcher';

export default function SalesPartialPaymentForm({
                                                    order,
                                                    onSuccess,
                                                    onCancel
                                                }) {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentReference, setPaymentReference] = useState('');
    const [narration, setNarration] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const totalAmount = Number(order?.totalAmount || 0);
    const receivedAmount = Number(order?.receivedAmount || 0);
    const dueAmount = Number(
        order?.balanceDue ?? Math.max(0, totalAmount - receivedAmount)
    );

    useEffect(() => {
        if (dueAmount > 0) {
            setAmount(dueAmount.toFixed(2));
        }
        setNarration(
            `Partial receipt against Invoice ${order?.invoiceNumber || order?.orderRef || ''}`
        );
    }, [order, dueAmount]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const payAmount = Number(amount);

        if (!payAmount || payAmount <= 0) {
            setError('Please enter a valid payment amount');
            return;
        }

        if (payAmount > dueAmount + 0.01) {
            setError(
                `Amount cannot exceed remaining due (${dueAmount.toFixed(2)})`
            );
            return;
        }

        setLoading(true);

        try {
            const result = await apiFetch(
                `/sales/${order.id}/partial-payment`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: payAmount,
                        paymentMethod,
                        paymentReference: paymentReference || null,
                        narration: narration || null
                    })
                }
            );

            if (result.error || result.success === false) {
                throw new Error(result.error || 'Payment failed');
            }

            alert(
                `Payment of ${payAmount.toFixed(2)} recorded successfully!\nRemaining Due: ${result.data?.remainingDue?.toFixed(2) || 0}`
            );

            if (onSuccess) onSuccess(result.data);
        } catch (err) {
            setError(err.message || 'Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    if (!order) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-6 max-w-lg">
            <div className="mb-5">
                <h3 className="text-lg font-bold text-gray-800">
                    Record Payment / Receipt
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Invoice: <span className="font-semibold text-[#017E84]">{order.invoiceNumber}</span>
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6 text-sm">
                <div className="bg-gray-50 border border-gray-200 rounded-sm p-3 text-center">
                    <div className="text-xs text-gray-500 uppercase font-semibold">Total</div>
                    <div className="font-bold text-gray-800 mt-1">{totalAmount.toFixed(2)}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-sm p-3 text-center">
                    <div className="text-xs text-green-600 uppercase font-semibold">Received</div>
                    <div className="font-bold text-green-700 mt-1">{receivedAmount.toFixed(2)}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-center">
                    <div className="text-xs text-red-600 uppercase font-semibold">Due</div>
                    <div className="font-bold text-red-700 mt-1">{dueAmount.toFixed(2)}</div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Payment Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={dueAmount}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Max allowed: {dueAmount.toFixed(2)}
                    </p>
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Payment Method
                    </label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                    >
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank</option>
                        <option value="BANK_CHECK">Bank Cheque</option>
                        <option value="CARD">Card</option>
                    </select>
                </div>

                {/* Reference */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Reference / Cheque No. (Optional)
                    </label>
                    <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="e.g. CHQ-12345"
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                    />
                </div>

                {/* Narration */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Narration
                    </label>
                    <textarea
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-sm">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading || dueAmount <= 0}
                        className="flex-1 bg-[#017E84] text-white py-2.5 rounded-sm text-sm font-semibold hover:opacity-90 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Record Payment'}
                    </button>

                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-5 py-2.5 border border-gray-300 rounded-sm text-sm font-medium hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}