'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';

export default function PurchaseOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    // --- State Variables ---
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [allVariants, setAllVariants] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newVariantId, setNewVariantId] = useState("");
    const [quantityConverted, setQuantityConverted] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [variantSearchTerm, setVariantSearchTerm] = useState("");
    const [isVariantDropdownOpen, setIsVariantDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsVariantDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        if (!id) return;
        const fetchOrderDetails = async () => {
            try {
                const { data } = await apiClient.get(`/purchase/orders/${id}`);
                if (data.success) {
                    setOrder(data.data);
                } else {
                    setError(data.message || 'Failed to fetch purchase order details.');
                }
            } catch (err) {
                console.error('Error fetching PO:', err);
                setError('An error occurred while fetching the purchase order.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrderDetails();
    }, [id, refreshKey]);

    useEffect(() => {
        const fetchAllVariants = async () => {
            try {
                const { data } = await apiClient.get(`/products/variants`);
                if (data.success) {
                    setAllVariants(data.data || []);
                }
            } catch (err) {
                console.error('Error fetching variants:', err);
            }
        };
        fetchAllVariants();
    }, []);

    // --- Actions ---
    const handlePrint = () => window.print();

    const openSortModal = (item) => {
        setSelectedItem(item);
        setNewVariantId("");
        setVariantSearchTerm("");
        setQuantityConverted("");
        setIsModalOpen(true);
    };

    const handleSortingSubmit = async (e) => {
        e.preventDefault();
        if (!newVariantId) {
            alert("Please select the actual correct product variant.");
            return;
        }
        setIsSubmitting(true);

        const payload = {
            purchaseOrderId: id,
            grnId: order?.grns?.[0]?.id || null,
            notes: "Worker sorting adjustment via frontend",
            godownId: order?.godownId,
            changes: [
                {
                    originalVariantId: selectedItem.productVariant.id,
                    newVariantId: newVariantId,
                    binId: "",
                    originalBatchId: selectedItem.batchId || "",
                    newBatchId: "",
                    quantityConverted: Number(quantityConverted),
                    unitCost: selectedItem.unitCost || selectedItem.price || 0
                }
            ]
        };

        try {
            const { data } = await apiClient.post(`/purchase/process-sorting`, payload);
            if (data.success) {
                alert("Stock re-classified and live inventory updated successfully!");
                setIsModalOpen(false);
                setRefreshKey(prev => prev + 1);
            } else {
                alert("Error: " + (data.error || "Failed to process sorting"));
            }
        } catch (err) {
            console.error("Sorting submission failed", err);
            if (err.response?.data?.error) {
                alert(`Validation Error: ${err.response.data.error}`);
            } else {
                alert("An error occurred while submitting the sorting adjustment.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredVariants = allVariants.filter(v => {
        const query = variantSearchTerm.toLowerCase();
        const productName = (v.product?.name || "").toLowerCase();
        const variantName = (v.name || "").toLowerCase();
        const sku = (v.sku || "").toLowerCase();
        return productName.includes(query) || variantName.includes(query) || sku.includes(query);
    });

    if (loading) return (
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
            <p className="text-gray-500 font-medium animate-pulse">Loading purchase order...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-500 font-bold bg-red-50 p-4 border border-red-200 rounded-sm mb-4">Error: {error}</p>
                <button onClick={() => router.push('/purchase/orders')} className="text-sm font-semibold text-gray-600 hover:text-gray-900 underline">
                    Go Back
                </button>
            </div>
        </div>
    );

    if (!order) return (
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
            <p className="text-gray-500 font-medium">Purchase Order not found.</p>
        </div>
    );

    const items = order.items || [];
    const subtotal = Number(order.subtotal || 0);
    const taxAmount = Number(order.taxAmount || 0);
    const courierCost = Number(order.courierCost || 0);
    const grandTotal = Number(order.grandTotal || 0);
    const advancePaid = Number(order.paidAmount || 0);
    const dueAmount = Number(order.dueAmount || 0);

    let supplierName = order.partner?.companyName || order.partner?.name || 'Unknown Supplier';
    let supplierAddress = order.partner?.address || '';
    let supplierPhone = order.partner?.phone || '';

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12 w-full flex flex-col">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body * { visibility: hidden; }
                    body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    #printable-memo, #printable-memo * { visibility: visible; }
                    #printable-memo { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; border: none !important; box-shadow: none !important; }
                }
            `}} />

            {/* ACTION BAR: Removed negative margins. Letting it span naturally. */}
            <div className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center  print:hidden shadow-sm gap-3">
                <Link href="/purchase/orders" className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Orders
                </Link>
                <button
                    onClick={handlePrint}
                    className="w-full sm:w-auto px-6 py-2 bg-[#017E84] hover:bg-[#01696e] text-white rounded text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print PO
                </button>
            </div>

            {/* Main Content Wrapper - Centers everything else without constraining the Action Bar */}
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">

                {/* SORTING ACTIONS PANEL */}
                {order.status === "RECEIVED" && (
                    <div className="mt-6 print:hidden">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="bg-blue-50 border-b border-blue-100 p-4">
                                <h3 className="text-lg font-semibold text-blue-900 mb-1">Post-Intake Stock Sorting</h3>
                                <p className="text-sm text-blue-700">
                                    Re-classify mislabeled items here. Live inventory updates automatically without modifying the vendor invoice.
                                </p>
                            </div>

                            <div className="p-4 flex flex-col gap-3">
                                {items.map((item, index) => (
                                    <div key={item.id || index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 border border-gray-200 rounded-md p-4 transition-all hover:border-blue-300 gap-4">
                                        <div className="flex-1">
                                            <h4 className="text-base font-semibold text-gray-800">
                                                {item.productVariant?.product?.name || 'Unknown Product'} {item.productVariant?.name ? `- ${item.productVariant.name}` : ''}
                                            </h4>
                                            <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                                                <span>SKU: <span className="font-mono font-medium text-gray-700">{item.productVariant?.sku || 'N/A'}</span></span>
                                                <span className="hidden sm:inline text-gray-300">|</span>
                                                <span>Received Qty: <span className="font-semibold text-gray-700">{item.quantityCount || item.quantity || 1}</span></span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openSortModal(item)}
                                            className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                            Re-classify
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PRINTABLE DOCUMENT CARD */}
                <div className="mt-6 print:p-0 print:mt-0">
                    <div id="printable-memo" className="bg-white p-6 sm:p-10 border border-gray-200 rounded-lg shadow-sm print:shadow-none print:border-none print:rounded-none">

                        <div className="text-center mb-8">
                            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Purchase Order</h3>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 uppercase">
                                M/S. NOOR ENTERPRISE
                            </h1>
                            <p className="text-sm text-gray-500 mt-2">
                                House # 09, Road # 20/D, Sector # 04, Uttara, Dhaka-1230.
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Mobile: +88 01719 431264
                            </p>
                        </div>
                        <div className="overflow-x-auto mb-6">
                            <table className="w-full border-collapse border border-gray-300 text-sm min-w-[500px]">
                                <tbody>
                                <tr className="divide-x divide-gray-300">
                                    <td className="border-y border-gray-300 bg-gray-50 font-semibold px-4 py-2 w-1/4 text-gray-700">
                                        Purchase from
                                    </td>
                                    <td className="border-y border-gray-300 px-4 py-2 text-gray-900">
                                        {supplierName}
                                        {supplierAddress && (
                                            <span className="block text-xs text-gray-500 mt-0.5">{supplierAddress}</span>
                                        )}
                                        {supplierPhone && (
                                            <span className="block text-xs text-gray-500">Mobile: {supplierPhone}</span>
                                        )}
                                    </td>
                                </tr>
                                <tr className="divide-x divide-gray-300">
                                    <td className="border-y border-gray-300 bg-gray-50 font-semibold px-4 py-2 text-gray-700">
                                        PO No.
                                    </td>
                                    <td className="border-y border-gray-300 px-4 py-2 text-gray-900 font-medium">
                                        {order.purchaseNumber || 'N/A'}
                                    </td>
                                </tr>
                                <tr className="divide-x divide-gray-300">
                                    <td className="border-y border-gray-300 bg-gray-50 font-semibold px-4 py-2 text-gray-700">Date</td>
                                    <td className="border-y border-gray-300 px-4 py-2 text-gray-900">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : 'N/A'}</td>
                                </tr>
                                <tr className="divide-x divide-gray-300">
                                    <td className="border-y border-gray-300 bg-gray-50 font-semibold px-4 py-2 text-gray-700">Order Status</td>
                                    <td className="border-y border-gray-300 px-4 py-2 text-gray-900">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {order.status || 'N/A'}
                                            </span>
                                    </td>
                                </tr>
                                <tr className="divide-x divide-gray-300">
                                    <td className="border-y border-gray-300 bg-gray-50 font-semibold px-4 py-2 text-gray-700">Payment Status</td>
                                    <td className="border-y border-gray-300 px-4 py-2 text-gray-900">{order.paymentStatus || 'N/A'}</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm min-w-[600px]">
                                <thead>
                                <tr className="bg-[#F5F5DC] text-gray-800 divide-x divide-gray-300">
                                    <th className="border-y border-gray-300 px-3 py-2 text-center font-semibold w-16">Sl.</th>
                                    <th className="border-y border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                                    <th className="border-y border-gray-300 px-3 py-2 text-right font-semibold w-24">Qty</th>
                                    <th className="border-y border-gray-300 px-3 py-2 text-right font-semibold w-32">Unit Cost</th>
                                    <th className="border-y border-gray-300 px-4 py-2 text-right font-semibold w-36">Total</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                {items.map((item, index) => (
                                    <tr key={item.id || index} className="divide-x divide-gray-200">
                                        <td className="px-3 py-2 text-center text-gray-500">{index + 1}</td>
                                        <td className="px-4 py-2 text-gray-900 font-medium">
                                            {item.productVariant?.product?.name || 'Unknown Product'}
                                            {item.productVariant?.sku && <span className="text-gray-400 text-xs ml-2 font-mono">({item.productVariant.sku})</span>}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-700">{item.quantityCount || item.quantity || 1}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">{Number(item.unitCost || item.price || 0).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right text-gray-900 font-medium">{Number(item.totalPrice || ((item.unitCost || item.price || 0) * (item.quantityCount || item.quantity || 1))).toFixed(2)}</td>
                                    </tr>
                                ))}
                                </tbody>
                                <tfoot className="divide-y divide-gray-200 bg-gray-50">
                                <tr>
                                    <td colSpan={4} className="px-4 py-2 text-right font-medium text-gray-600">Sub Total</td>
                                    <td className="px-4 py-2 text-right font-semibold text-gray-900 border-l border-gray-200">{subtotal.toFixed(2)}</td>
                                </tr>
                                {taxAmount > 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-2 text-right font-medium text-gray-600">Tax / VAT</td>
                                        <td className="px-4 py-2 text-right text-gray-900 border-l border-gray-200">{taxAmount.toFixed(2)}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td colSpan={4} className="px-4 py-2 text-right font-medium text-gray-600">Courier / Shipping</td>
                                    <td className="px-4 py-2 text-right text-gray-900 border-l border-gray-200">{courierCost.toFixed(2)}</td>
                                </tr>
                                <tr className="bg-gray-100">
                                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-800">Grand Total</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900 border-l border-gray-200">{grandTotal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="px-4 py-2 text-right font-medium text-gray-600">Advance (Paid)</td>
                                    <td className="px-4 py-2 text-right text-gray-900 border-l border-gray-200">{advancePaid.toFixed(2)}</td>
                                </tr>
                                <tr className={dueAmount > 0 ? "bg-red-50" : ""}>
                                    <td colSpan={4} className={`px-4 py-2 text-right font-bold ${dueAmount > 0 ? 'text-red-700' : 'text-gray-800'}`}>Due Amount</td>
                                    <td className={`px-4 py-2 text-right font-bold border-l border-gray-200 ${dueAmount > 0 ? 'text-red-700' : 'text-gray-900'}`}>{dueAmount.toFixed(2)}</td>
                                </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                {/* RE-EVALUATION HISTORY */}
                {order.reevaluations && order.reevaluations.length > 0 && (
                    <div className="mt-6 print:hidden">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">Re-classification History</h3>
                                    <p className="text-sm text-gray-500">Post-intake corrections performed by warehouse staff.</p>
                                </div>
                            </div>

                            <div className="p-4 space-y-4">
                                {order.reevaluations.map((reval) => (
                                    <div key={reval.id} className="border border-gray-200 rounded-md bg-white">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-gray-500 p-3 bg-gray-50 border-b border-gray-200">
                                            <span>User: <strong className="text-gray-700">{reval.performedBy?.name || 'System User'}</strong></span>
                                            <span>Date: {new Date(reval.createdAt).toLocaleString()}</span>
                                        </div>
                                        {reval.notes && <div className="p-3 border-b border-gray-100 text-sm text-gray-600 bg-white italic">Notes: {reval.notes}</div>}

                                        <div className="overflow-x-auto p-3">
                                            <table className="w-full text-sm min-w-[600px]">
                                                <thead>
                                                <tr className="text-gray-500 border-b border-gray-200">
                                                    <th className="pb-2 text-left font-medium">Original (Mislabeled)</th>
                                                    <th className="pb-2 text-left font-medium">Corrected Item</th>
                                                    <th className="pb-2 text-center font-medium">Location</th>
                                                    <th className="pb-2 text-right font-medium">Qty</th>
                                                </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                {reval.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="py-3 text-red-600 line-through pr-4">
                                                            {item.originalVariant?.product?.name} - {item.originalVariant?.name}
                                                            <span className="block text-xs text-red-400 font-mono mt-1">SKU: {item.originalVariant?.sku}</span>
                                                        </td>
                                                        <td className="py-3 font-semibold text-green-700 pr-4">
                                                            {item.newVariant?.product?.name} - {item.newVariant?.name}
                                                            <span className="block text-xs text-green-600 font-mono mt-1 font-normal">SKU: {item.newVariant?.sku}</span>
                                                        </td>
                                                        <td className="py-3 text-center text-xs text-gray-500">
                                                            <span className="bg-gray-100 px-2 py-1 rounded">Bin: {item.bin?.name || 'Auto'}</span>
                                                        </td>
                                                        <td className="py-3 text-right font-bold text-gray-900">
                                                            {item.quantityConverted}
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div> {/* End Main Content Wrapper */}

            {/* SORTING MODAL */}
            {isModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] print:hidden p-4">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-2xl mx-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-semibold text-gray-900">Re-classify Stock</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSortingSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Original Item (Locked)</label>
                                <input
                                    type="text"
                                    disabled
                                    value={`${selectedItem.productVariant?.product?.name || ''} - ${selectedItem.productVariant?.name || 'Unknown'} (SKU: ${selectedItem.productVariant?.sku || ''})`}
                                    className="w-full border border-gray-200 rounded-md p-2.5 bg-gray-50 cursor-not-allowed text-sm text-gray-500 shadow-sm"
                                />
                            </div>

                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Actual Item Found</label>
                                <div
                                    onClick={() => setIsVariantDropdownOpen(!isVariantDropdownOpen)}
                                    className="w-full border border-gray-300 rounded-md p-2.5 bg-white text-sm cursor-pointer flex justify-between items-center shadow-sm hover:border-gray-400 transition-colors"
                                >
                                    <span className={newVariantId ? "text-gray-900 font-medium truncate" : "text-gray-400"}>
                                        {newVariantId
                                            ? (() => {
                                                const found = allVariants.find(v => v.id === newVariantId);
                                                return found ? `${found.product?.name || ''} - ${found.name} (SKU: ${found.sku})` : "Select Correct Variant";
                                            })()
                                            : "Search product name or SKU..."}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                                </div>

                                {isVariantDropdownOpen && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        <div className="p-2 sticky top-0 bg-white border-b border-gray-100">
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Search product..."
                                                value={variantSearchTerm}
                                                onChange={(e) => setVariantSearchTerm(e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#017E84] focus:border-transparent"
                                            />
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {filteredVariants.length > 0 ? (
                                                filteredVariants.map(v => (
                                                    <div
                                                        key={v.id}
                                                        onClick={() => {
                                                            setNewVariantId(v.id);
                                                            setIsVariantDropdownOpen(false);
                                                        }}
                                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm transition-colors"
                                                    >
                                                        <div className="font-medium text-gray-900">{v.product?.name || 'Product'} - {v.name}</div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5">SKU: {v.sku}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-sm text-gray-500 text-center">No products found.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity Corrected</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    max={selectedItem.quantityCount || selectedItem.quantity}
                                    value={quantityConverted}
                                    onChange={(e) => setQuantityConverted(e.target.value)}
                                    placeholder={`Max allowed: ${selectedItem.quantityCount || selectedItem.quantity}`}
                                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#017E84] focus:border-transparent"
                                />
                            </div>

                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>Target Warehouse Bin and Batch assignments are automated securely by the background Put-Away engine.</span>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-[#017E84] text-white rounded-md hover:bg-[#01696e] text-sm font-medium disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {isSubmitting ? "Processing..." : "Update Stock"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}