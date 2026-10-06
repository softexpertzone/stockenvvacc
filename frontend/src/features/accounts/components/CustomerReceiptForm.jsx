'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { API_BASE, API_ENDPOINTS } from '@/config/apiEndpoints';

function getAuthToken() {
    if (typeof window === 'undefined') return null;
    return (
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('authToken') ||
        null
    );
}

async function apiFetch(path, options = {}) {
    const token = getAuthToken();
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
    }
    return data;
}

/**
 * Accounts Module – Customer Receipt (Partial / Full Sales Payment)
 *
 * Mirrors vendor (purchase) payment flow in financeService.recordCustomerReceipt
 *
 * Props (all optional):
 *   initialSalesOrderId – pre-select an order
 *   onSuccess(result)   – called after successful receipt
 *   onCancel()          – close / back
 */
export default function CustomerReceiptForm({
                                                initialSalesOrderId = null,
                                                onSuccess,
                                                onCancel,
                                            }) {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [selectedOrderId, setSelectedOrderId] = useState(initialSalesOrderId || '');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Load sales orders that still have balance due
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingOrders(true);
            try {
                const data = await apiFetch(API_ENDPOINTS.SALES.ORDERS || '/sales');
                const list = Array.isArray(data.data) ? data.data : [];
                const unpaid = list.filter((o) => {
                    const due = Number(
                        o.balanceDue ??
                        o.dueAmount ??
                        Math.max(
                            0,
                            Number(o.totalAmount || 0) -
                            Number(o.receivedAmount || 0)
                        )
                    );
                    return due > 0.01;
                });
                if (!cancelled) {
                    setOrders(unpaid);
                    if (initialSalesOrderId) {
                        setSelectedOrderId(initialSalesOrderId);
                    }
                }
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoadingOrders(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [initialSalesOrderId]);

    const selectedOrder = useMemo(
        () => orders.find((o) => o.id === selectedOrderId) || null,
        [orders, selectedOrderId]
    );

    const dueAmount = useMemo(() => {
        if (!selectedOrder) return 0;
        return Number(
            selectedOrder.balanceDue ??
            selectedOrder.dueAmount ??
            Math.max(
                0,
                Number(selectedOrder.totalAmount || 0) -
                Number(selectedOrder.receivedAmount || 0)
            )
        );
    }, [selectedOrder]);

    // Pre-fill amount when order selected
    useEffect(() => {
        if (selectedOrder && dueAmount > 0) {
            setAmount(dueAmount.toFixed(2));
        } else {
            setAmount('');
        }
    }, [selectedOrderId, dueAmount]);

    const amountNum = useMemo(() => {
        const n = parseFloat(amount);
        return isNaN(n) ? 0 : n;
    }, [amount]);

    const remainingAfter = Math.max(0, dueAmount - amountNum);

    const isValid =
        selectedOrderId &&
        amountNum > 0 &&
        amountNum <= dueAmount + 0.01 &&
        paymentMethod;

    const customerLabel = (o) => {
        const p = o.partner || o.customer || {};
        return (
            p.companyName ||
            p.name ||
            o.customerName ||
            o.partnerName ||
            'Customer'
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid || submitting) return;

        setSubmitting(true);
        setError(null);
        setSuccessMsg(null);

        try {
            // Prefer dedicated finance endpoint; fallback to sales partial-payment
            const financePath =
                (API_ENDPOINTS.FINANCE &&
                    API_ENDPOINTS.FINANCE.CUSTOMER_RECEIPT) ||
                '/finance/customer-receipt';

            let result;
            try {
                result = await apiFetch(financePath, {
                    method: 'POST',
                    body: JSON.stringify({
                        salesOrderId: selectedOrderId,
                        amountReceived: amountNum,
                        paymentMethod,
                        paymentReference: reference.trim() || null,
                        notes: notes.trim() || null,
                    }),
                });
            } catch (financeErr) {
                // Fallback: sales partial-payment route
                const salesPath =
                    (API_ENDPOINTS.SALES &&
                        API_ENDPOINTS.SALES.PARTIAL_PAYMENT &&
                        API_ENDPOINTS.SALES.PARTIAL_PAYMENT(selectedOrderId)) ||
                    `/sales/${selectedOrderId}/partial-payment`;

                result = await apiFetch(salesPath, {
                    method: 'POST',
                    body: JSON.stringify({
                        amount: amountNum,
                        paymentMethod,
                        paymentReference: reference.trim() || null,
                        narration: notes.trim() || null,
                    }),
                });
            }

            const receivedNow =
                result?.data?.receivedNow ??
                result?.data?.paidNow ??
                amountNum;
            const remaining =
                result?.data?.remainingDue ?? remainingAfter;

            const msg = `Receipt of ৳${Number(receivedNow).toFixed(2)} recorded. Remaining due: ৳${Number(remaining).toFixed(2)}.`;
            setSuccessMsg(msg);

            // Refresh unpaid list
            setOrders((prev) =>
                prev
                    .map((o) =>
                        o.id === selectedOrderId
                            ? {
                                ...o,
                                receivedAmount:
                                    Number(o.receivedAmount || 0) +
                                    Number(receivedNow),
                                balanceDue: remaining,
                            }
                            : o
                    )
                    .filter((o) => Number(o.balanceDue) > 0.01)
            );

            if (remaining <= 0.01) {
                setSelectedOrderId('');
                setAmount('');
            } else {
                setAmount(Number(remaining).toFixed(2));
            }

            if (typeof onSuccess === 'function') {
                onSuccess(result);
            }
        } catch (err) {
            console.error('Customer receipt error:', err);
            setError(err.message || 'Failed to record receipt');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm max-w-xl">
            <div className="bg-[#017E84] px-5 py-3 flex items-center justify-between">
                <h2 className="text-white font-semibold text-base">
                    Customer Receipt (Sales Payment)
                </h2>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-white/80 hover:text-white"
                    >
                        ×
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Sales Order selector */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Sales Order / Invoice <span className="text-red-500">*</span>
                    </label>
                    {loadingOrders ? (
                        <p className="text-sm text-gray-500">Loading unpaid orders…</p>
                    ) : orders.length === 0 ? (
                        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-sm px-3 py-2">
                            No sales orders with outstanding due.
                        </p>
                    ) : (
                        <select
                            value={selectedOrderId}
                            onChange={(e) => setSelectedOrderId(e.target.value)}
                            className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] bg-white"
                            required
                        >
                            <option value="">-- Select unpaid invoice --</option>
                            {orders.map((o) => {
                                const due = Number(
                                    o.balanceDue ??
                                    o.dueAmount ??
                                    Math.max(
                                        0,
                                        Number(o.totalAmount || 0) -
                                        Number(o.receivedAmount || 0)
                                    )
                                );
                                return (
                                    <option key={o.id} value={o.id}>
                                        {o.invoiceNumber ||
                                            o.orderRef ||
                                            o.orderNumber ||
                                            o.id.slice(0, 8)}{' '}
                                        — {customerLabel(o)} — Due: ৳
                                        {due.toFixed(2)}
                                    </option>
                                );
                            })}
                        </select>
                    )}
                </div>

                {/* Summary */}
                {selectedOrder && (
                    <div className="bg-gray-50 border border-gray-200 rounded-sm p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Customer</span>
                            <span className="font-medium">
                                {customerLabel(selectedOrder)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Grand Total</span>
                            <span>
                                ৳
                                {Number(
                                    selectedOrder.totalAmount || 0
                                ).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Already Received</span>
                            <span className="text-green-700">
                                ৳
                                {Number(
                                    selectedOrder.receivedAmount || 0
                                ).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
                            <span>Due Amount</span>
                            <span className="text-red-700">
                                ৳{dueAmount.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Amount Received <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={dueAmount || undefined}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84]"
                        placeholder="0.00"
                        required
                        disabled={!selectedOrder}
                    />
                    {amountNum > 0 && amountNum <= dueAmount && (
                        <p className="text-xs text-gray-500 mt-1">
                            Remaining after this receipt: ৳
                            {remainingAfter.toFixed(2)}
                        </p>
                    )}
                </div>

                {/* Method */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] bg-white"
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
                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84]"
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
                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] resize-none"
                        placeholder="Optional"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-sm">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-sm">
                        {successMsg}
                    </div>
                )}

                <div className="flex gap-3 pt-1">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={submitting}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!isValid || submitting}
                        className="flex-1 px-4 py-2 bg-[#017E84] hover:opacity-90 text-white rounded-sm text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Saving…' : 'Record Receipt'}
                    </button>
                </div>
            </form>
        </div>
    );
}