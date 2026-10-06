'use client';
import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE, API_ENDPOINTS } from '@/config/apiEndpoints';
import SalesPartialPaymentForm from '@/features/sales/components/SalesPartialPaymentForm';

function getAuthToken() {
    if (typeof window === 'undefined') return null;
    return (
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('authToken') ||
        null
    );
}

async function fetchWithAuth(url, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };
    return fetch(url, { ...options, headers });
}

export default function SalesOrderDetailPage({ params }) {
    const resolvedParams = use(params);
    const orderId = resolvedParams.id;
    const router = useRouter();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

    const showToast = (type, message, duration = 3500) => {
        setToast({ type, message });
        if (duration > 0) {
            setTimeout(() => setToast(null), duration);
        }
    };

    const loadOrder = async (silent = false) => {
        if (!orderId) return;
        if (!silent) setLoading(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE}${API_ENDPOINTS.SALES.DETAIL(orderId)}`
            );
            const data = await res.json();

            if (data.success) {
                setOrder(data.data);
                setError(null);
            } else {
                setError(data.error || data.message || 'Order not found');
                setOrder(null);
            }
        } catch (err) {
            if (!silent) {
                setError(err.message || 'Failed to load order');
                setOrder(null);
            }
            throw err;
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;

        (async () => {
            try {
                await loadOrder(false);
            } catch {
                // error already set inside loadOrder
            }
            if (cancelled) return;
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const refreshOrder = async (retries = 3) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await loadOrder(true);
                return true;
            } catch (err) {
                console.warn(`Refresh attempt ${attempt} failed:`, err.message);
                if (attempt < retries) {
                    await new Promise((r) => setTimeout(r, 600 * attempt));
                }
            }
        }
        return false;
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePaymentSuccess = async (data) => {
        setShowPaymentForm(false);

        const paidNow =
            data?.data?.paidNow ??
            data?.data?.amount ??
            data?.paidNow ??
            null;

        const remainingDue =
            data?.data?.remainingDue ??
            data?.data?.balanceDue ??
            null;

        let msg = 'Payment recorded successfully.';
        if (paidNow != null) {
            msg = `Payment of ৳${Number(paidNow).toFixed(2)} recorded successfully.`;
        }
        if (remainingDue != null) {
            msg += ` Remaining due: ৳${Number(remainingDue).toFixed(2)}.`;
        }

        showToast('success', msg, 4000);

        // Retry refresh a few times in case backend is briefly unavailable
        const ok = await refreshOrder(3);
        if (!ok) {
            showToast(
                'error',
                'Payment may have been saved, but order could not be refreshed. Reloading…',
                2500
            );
            // Last resort: full page reload after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1200);
            return;
        }

        // Optional: redirect to orders list after short delay
        // Uncomment if you prefer to leave the detail page:
        // setTimeout(() => {
        //     router.push('/sales/orders');
        // }, 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <p className="text-gray-500 font-medium animate-pulse">
                    Loading cash memo...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <p className="text-red-500 font-bold bg-red-50 p-4 border border-red-200 rounded-sm">
                    Error: {error}
                </p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <p className="text-gray-500 font-medium">Order not found.</p>
            </div>
        );
    }

    // --- FINANCIAL CALCULATIONS ---
    const items = order.items || [];
    const subtotal = items.reduce(
        (sum, item) =>
            sum + Number(item.totalPrice || item.price * item.quantity || 0),
        0
    );

    const taxAmount = Number(
        order.taxAmount ||
        order.tax ||
        order.vatAmount ||
        order.vat ||
        order.gst ||
        0
    );

    const courierCost = Number(
        order.courierCost ||
        order.shippingCost ||
        order.shipping ||
        order.deliveryFee ||
        order.deliveryCharge ||
        0
    );

    const grandTotal = Number(
        order.totalAmount ??
        order.grandTotal ??
        order.total ??
        subtotal + taxAmount + courierCost
    );

    const advancePaid = Number(
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
        Math.max(0, grandTotal - advancePaid)
    );

    // --- CUSTOMER DATA ---
    let customerName = 'Walk-in Customer';
    let customerAddress = '';
    let customerPhone = '';

    const partnerEntity = order.partner || order.customer || order.buyer;

    if (
        partnerEntity &&
        typeof partnerEntity === 'object' &&
        !Array.isArray(partnerEntity)
    ) {
        customerName =
            partnerEntity.companyName ||
            partnerEntity.name ||
            partnerEntity.fullName ||
            customerName;
        customerAddress = partnerEntity.address || '';
        customerPhone = partnerEntity.phone || partnerEntity.mobile || '';
    } else {
        const potentialNames = [
            order.customerName,
            order.partnerName,
            order.buyerName,
        ];
        for (const nameString of potentialNames) {
            if (
                nameString &&
                typeof nameString === 'string' &&
                isNaN(Number(nameString))
            ) {
                customerName = nameString;
                break;
            }
        }

        if (
            customerName === 'Walk-in Customer' &&
            (order.customerId || order.partnerId)
        ) {
            customerName = `Customer ID: ${order.customerId || order.partnerId}`;
        }

        customerAddress =
            order.shippingAddress ||
            order.billingAddress ||
            order.address ||
            '';
        customerPhone = order.customerPhone || order.phone || '';
    }

    const getItemDescription = (item) => {
        return (
            item.productVariant?.product?.name ||
            item.productVariant?.name ||
            item.productVariant?.title ||
            item.product?.name ||
            item.productName ||
            item.name ||
            item.description ||
            item.productVariant?.sku ||
            'Product Item'
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 text-black font-sans pb-12">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                    @page { 
                        size: A4 portrait;
                        margin: 10mm; 
                    }
                    body * { visibility: hidden; }
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #printable-memo, #printable-memo * { visibility: visible; }
                    #printable-memo {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                }
            `,
                }}
            />

            {/* Success / Error Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-[100] max-w-sm px-4 py-3 rounded-sm shadow-lg text-sm font-medium print:hidden transition-all ${
                        toast.type === 'success'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                    }`}
                    role="alert"
                >
                    <div className="flex items-start gap-2">
                        {toast.type === 'success' ? (
                            <svg
                                className="w-5 h-5 flex-shrink-0 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-5 h-5 flex-shrink-0 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        )}
                        <span>{toast.message}</span>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="ml-2 opacity-80 hover:opacity-100"
                            aria-label="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="bg-white border-b border-gray-300 px-6 py-3 flex justify-between items-center sticky top-0 z-10 print:hidden shadow-sm">
                <Link
                    href="/sales/orders"
                    className="text-sm font-semibold text-gray-600 hover:text-black flex items-center gap-2"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    Back to Orders
                </Link>

                <div className="flex items-center gap-3">
                    {dueAmount > 0 && (
                        <button
                            onClick={() => setShowPaymentForm(true)}
                            className="px-5 py-1.5 bg-[#017E84] hover:opacity-90 text-white rounded-sm text-sm font-medium transition-colors shadow-sm"
                        >
                            Record Payment
                        </button>
                    )}

                    <button
                        onClick={handlePrint}
                        className="px-6 py-1.5 bg-black hover:bg-gray-800 text-white rounded-sm text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                            />
                        </svg>
                        Print Memo
                    </button>
                </div>
            </div>

            {/* Printable Cash Memo Card */}
            <div className="max-w-3xl mx-auto mt-6 px-4 print:p-0 print:mt-0">
                <div
                    id="printable-memo"
                    className="bg-white p-8 border border-black shadow-md print:shadow-none print:border-none"
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h3 className="text-base font-semibold tracking-wide text-gray-800">
                            Cash Memo
                        </h3>
                        <h1 className="text-2xl font-bold tracking-wider text-black uppercase mt-1">
                            M/S. NOOR ENTERPRISE
                        </h1>
                        <p className="text-xs font-medium text-gray-700 mt-1">
                            House # 09, Road # 20/D, Sector # 04, Uttara,
                            Dhaka-1230.
                        </p>
                        <p className="text-xs font-medium text-gray-700">
                            Mobile: +88 01719 431264
                        </p>
                    </div>

                    {/* Order & Customer Information Table */}
                    <table className="w-full border-collapse border border-black text-sm mb-4">
                        <tbody>
                        <tr>
                            <td className="border border-black bg-gray-200 font-bold px-3 py-1 w-28 text-left">
                                No.
                            </td>
                            <td className="border border-black px-3 py-1 font-semibold">
                                {order.invoiceNumber ||
                                    order.orderRef ||
                                    order.orderNumber ||
                                    'N/A'}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black bg-gray-200 font-bold px-3 py-1 text-left">
                                Name
                            </td>
                            <td className="border border-black px-3 py-1 font-bold">
                                {customerName}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black bg-gray-200 font-bold px-3 py-1 text-left">
                                Address
                            </td>
                            <td className="border border-black px-3 py-1">
                                {customerAddress}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black bg-gray-200 font-bold px-3 py-1 text-left">
                                Date
                            </td>
                            <td className="border border-black px-3 py-1">
                                {order.createdAt
                                    ? new Date(
                                        order.createdAt
                                    ).toLocaleDateString('en-GB')
                                    : 'N/A'}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black bg-gray-200 font-bold px-3 py-1 text-left">
                                Mobile
                            </td>
                            <td className="border border-black px-3 py-1">
                                {customerPhone}
                            </td>
                        </tr>
                        </tbody>
                    </table>

                    {/* Line Items Table */}
                    <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                        <tr className="bg-gray-200 text-black">
                            <th className="border border-black px-2 py-1 text-center font-bold w-16">
                                Sl. No.
                            </th>
                            <th className="border border-black px-3 py-1 text-center font-bold">
                                Description
                            </th>
                            <th className="border border-black px-2 py-1 text-right font-bold w-24">
                                Quantity
                            </th>
                            <th className="border border-black px-2 py-1 text-right font-bold w-28">
                                Price
                            </th>
                            <th className="border border-black px-2 py-1 text-right font-bold w-32">
                                Taka
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map((item, index) => (
                            <tr key={item.id || index} className="h-7">
                                <td className="border border-black px-2 py-1 text-center">
                                    {index + 1}
                                </td>
                                <td className="border border-black px-3 py-1 font-medium">
                                    {getItemDescription(item)}
                                </td>
                                <td className="border border-black px-2 py-1 text-right">
                                    {item.orderedQuantity ||
                                        item.quantity ||
                                        1}
                                </td>
                                <td className="border border-black px-2 py-1 text-right">
                                    {Number(
                                        item.unitPrice || item.price || 0
                                    ).toFixed(2)}
                                </td>
                                <td className="border border-black px-2 py-1 text-right font-medium">
                                    {Number(
                                        item.totalPrice ||
                                        item.price * item.quantity ||
                                        0
                                    ).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {items.length < 5 &&
                            Array.from({
                                length: 5 - items.length,
                            }).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-7">
                                    <td className="border border-black px-2 py-1 text-center">
                                        {items.length + i + 1}
                                    </td>
                                    <td className="border border-black px-3 py-1"></td>
                                    <td className="border border-black px-2 py-1"></td>
                                    <td className="border border-black px-2 py-1"></td>
                                    <td className="border border-black px-2 py-1"></td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot>
                        <tr>
                            <td
                                colSpan={4}
                                className="border border-black px-3 py-1 text-right font-bold"
                            >
                                Sub Total=
                            </td>
                            <td className="border border-black px-2 py-1 text-right font-bold">
                                {subtotal.toFixed(2)}
                            </td>
                        </tr>
                        {taxAmount > 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="border border-black px-3 py-1 text-right font-bold"
                                >
                                    VAT / Tax{' '}
                                    {order.taxName
                                        ? `(${order.taxName})`
                                        : ''}
                                    =
                                </td>
                                <td className="border border-black px-2 py-1 text-right font-semibold">
                                    {taxAmount.toFixed(2)}
                                </td>
                            </tr>
                        )}
                        <tr>
                            <td
                                colSpan={4}
                                className="border border-black px-3 py-1 text-right font-bold"
                            >
                                Courier Cost=
                            </td>
                            <td className="border border-black px-2 py-1 text-right font-semibold">
                                {courierCost.toFixed(2)}
                            </td>
                        </tr>
                        <tr className="bg-gray-100">
                            <td
                                colSpan={4}
                                className="border border-black px-3 py-1 text-right font-bold"
                            >
                                Grand Total=
                            </td>
                            <td className="border border-black px-2 py-1 text-right font-bold">
                                {grandTotal.toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td
                                colSpan={4}
                                className="border border-black px-3 py-1 text-right font-bold"
                            >
                                Advance (Paid)=
                            </td>
                            <td className="border border-black px-2 py-1 text-right font-semibold">
                                {advancePaid.toFixed(2)}
                            </td>
                        </tr>
                        <tr
                            className={
                                dueAmount > 0
                                    ? 'bg-red-50 text-red-800'
                                    : ''
                            }
                        >
                            <td
                                colSpan={4}
                                className="border border-black px-3 py-1 text-right font-bold"
                            >
                                Due Amount=
                            </td>
                            <td className="border border-black px-2 py-1 text-right font-bold">
                                {dueAmount.toFixed(2)}
                            </td>
                        </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Partial Payment Modal */}
            {showPaymentForm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 print:hidden">
                    <SalesPartialPaymentForm
                        order={order}
                        onSuccess={handlePaymentSuccess}
                        onCancel={() => setShowPaymentForm(false)}
                    />
                </div>
            )}
        </div>
    );
}