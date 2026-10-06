'use client';

import React, { useState, useMemo } from 'react';
import { API_BASE, API_ENDPOINTS } from '@/config/apiEndpoints';

/**
 * SalesPartialPaymentForm
 * Records a partial (or full) payment against a sales order.
 *
 * Backend route: POST /api/sales/:id/partial-payment
 * Body: { amount, paymentMethod, paymentReference, narration }
 */
export default function SalesPartialPaymentForm({ order, onSuccess, onCancel }) {
    const grandTotal = Number(
        order.totalAmount ??
        order.grandTotal ??
        order.total ??
        0
    );

    const alreadyPaid = Number(
        order.receivedAmount ??
        order.paidAmount ??
        order.advanceAmount ??
        order.paid ??
        order.advance ??
        0
    );

    const dueAmount = Number(
        order.balanceDue ??
        order.dueAmount ??
        order.due ??
        order.balance ??
        Math.max(0, grandTotal - alreadyPaid)
    );

    const [amount, setAmount] = useState(
        dueAmount > 0 ? dueAmount.toFixed(2) : ''
    );
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const amountNum = useMemo(() => {
        const n = parseFloat(amount);
        return isNaN(n) ? 0 : n;
    }, [amount]);

    const remainingAfter = useMemo(
        () => Math.max(0, dueAmount - amountNum),
        [dueAmount, amountNum]
    );

    const isValid =
        amountNum > 0 &&
        amountNum <= dueAmount + 0.001 &&
        paymentMethod;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid || submitting) return;

        setSubmitting(true);
        setError(null);

        try {
            // Exact backend route: POST /api/sales/:id/partial-payment
            const endpoint =
                (API_ENDPOINTS.SALES && API_ENDPOINTS.SALES.PARTIAL_PAYMENT)
                    ? API_ENDPOINTS.SALES.PARTIAL_PAYMENT(order.id)
                    : `/sales/${order.id}/partial-payment`;

            const url = `${API_BASE}${endpoint}`;

            // Match salesController.recordPartialPayment expected body
            const payload = {
                amount: amountNum,
                paymentMethod,
                paymentReference: reference.trim() || null,
                narration: notes.trim() || null,
            };

            console.log('=== PARTIAL PAYMENT DEBUG ===');
            console.log('URL being called →', url);
            console.log('Payload →', payload);
            console.log('Order ID →', order.id);
            
            const token =
                (typeof window !== 'undefined' &&
                    (localStorage.getItem('token') ||
                        localStorage.getItem('accessToken') ||
                        localStorage.getItem('authToken'))) ||
                null;

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || data.success === false) {
                throw new Error(
                    data.error ||
                    data.message ||
                    `Payment failed (${res.status})`
                );
            }

            if (typeof onSuccess === 'function') {
                onSuccess(data);
            }
        } catch (err) {
            console.error('Partial payment error:', err);
            const message =
                err.message === 'Failed to fetch'
                    ? 'Server did not respond. Check backend terminal for errors.'
                    : err.message || 'Failed to record payment';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-sm shadow-xl w-full max-w-md border border-gray-300 overflow-hidden">
            {/* Header */}
            <div className="bg-[#017E84] px-5 py-3 flex items-center justify-between">
                <h2 className="text-white font-semibold text-base tracking-wide">
                    Record Payment
                </h2>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-white/80 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Order summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-sm p-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Invoice / Order</span>
                        <span className="font-semibold text-gray-900">
                            {order.invoiceNumber ||
                                order.orderRef ||
                                order.orderNumber ||
                                order.id?.slice?.(0, 8) ||
                                '—'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Grand Total</span>
                        <span className="font-medium">
                            {grandTotal.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Already Paid</span>
                        <span className="font-medium text-green-700">
                            {alreadyPaid.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                        <span className="text-gray-800 font-semibold">
                            Due Amount
                        </span>
                        <span className="font-bold text-red-700">
                            {dueAmount.toFixed(2)}
                        </span>
                    </div>
                </div>

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
                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                        placeholder="0.00"
                        required
                        autoFocus
                    />
                    {amountNum > dueAmount && (
                        <p className="text-xs text-red-600 mt-1">
                            Amount cannot exceed due amount (
                            {dueAmount.toFixed(2)})
                        </p>
                    )}
                    {amountNum > 0 && amountNum <= dueAmount && (
                        <p className="text-xs text-gray-500 mt-1">
                            Remaining after this payment:{' '}
                            <span className="font-medium">
                                {remainingAfter.toFixed(2)}
                            </span>
                        </p>
                    )}
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84] bg-white"
                        required
                    >
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CARD">Card</option>
                        <option value="MOBILE_BANKING">Mobile Banking</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                {/* Reference */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Reference / Cheque No.
                    </label>
                    <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                        placeholder="Optional"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84] resize-none"
                        placeholder="Optional notes..."
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-sm">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!isValid || submitting}
                        className="flex-1 px-4 py-2 bg-[#017E84] hover:opacity-90 text-white rounded-sm text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Saving...' : 'Record Payment'}
                    </button>
                </div>
            </form>
        </div>
    );
}