'use client';

import React, { useState, useEffect } from 'react';
import { usePurchases } from '../../../features/purchase/hooks/usePurchases';
import PurchaseItemModal from '@/features/purchase/components/PurchaseItemModal';
import { apiFetch } from '@/lib/apiFetcher';
import Toast from '@/components/ui/Toast';

export default function NewPurchaseOrderPage() {
    const { cart, suppliers, addRow, updateRow, removeRow, processPurchase, loading, setCart } = usePurchases();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [availableProducts, setAvailableProducts] = useState([]);

    // Financial fields
    const [taxAmount, setTaxAmount] = useState(0);
    const [courierCost, setCourierCost] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);

    // Soft toast state
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // Fetch master catalog
    useEffect(() => {
        let isMounted = true;

        const fetchCatalog = async () => {
            try {
                const response = await apiFetch('/api/inventory/products');

                // apiFetch never throws – check for error explicitly
                if (response.error || response.status >= 400) {
                    console.error("Catalog fetch failed:", response.error || `Status ${response.status}`);
                    if (isMounted) setAvailableProducts([]);
                    return;
                }

                if (!isMounted) return;

                const rawProducts = response?.data?.data || response?.data || [];

                const validProducts = Array.isArray(rawProducts)
                    ? rawProducts.filter(p =>
                        Array.isArray(p.productVariants) && p.productVariants.length > 0
                    )
                    : [];

                const formattedProducts = validProducts.map(product => {
                    const firstVariant = product.productVariants[0];
                    const actualPrice =
                        product.purchasePrice ??
                        firstVariant?.purchasePrice ??
                        product.price ??
                        firstVariant?.price ??
                        0;

                    return {
                        ...product,
                        purchasePrice: Number(actualPrice) || 0,
                        price: Number(actualPrice) || 0
                    };
                });

                setAvailableProducts(formattedProducts);
            } catch (err) {
                // Only reaches here on unexpected JS errors
                console.error("Catalog fetch unexpected error:", err);
                if (isMounted) setAvailableProducts([]);
            }
        };

        fetchCatalog();

        return () => {
            isMounted = false;
        };
    }, []);

    const subtotal = (cart || []).reduce((acc, item) =>
        acc + (Number(item.qty || 0) * Number(item.price || 0)), 0
    );

    const grandTotal = subtotal + Number(taxAmount || 0) + Number(courierCost || 0);
    const dueAmount = Math.max(0, grandTotal - Number(paidAmount || 0));

    const handleSupplierChange = (e) => {
        const supplier = suppliers?.find(s => s.id === e.target.value);
        setSelectedSupplier(supplier || null);
    };

    const handleConfirm = async () => {
        if (!selectedSupplier) {
            setToast({ message: 'Please select a vendor first.', type: 'error' });
            return;
        }

        if (!cart || cart.length === 0) {
            setToast({ message: 'Your cart is empty.', type: 'error' });
            return;
        }

        try {
            const formattedItems = cart.map(item => {
                const variantId = item.productVariants && item.productVariants.length > 0
                    ? item.productVariants[0].id
                    : item.variantId;

                return {
                    productVariantId: variantId,
                    qty: Number(item.qty),
                    price: Number(item.price),
                    totalPrice: Number(item.qty) * Number(item.price),
                    _debugName: item.name
                };
            });

            const faultyItems = formattedItems.filter(i => !i.productVariantId);

            if (faultyItems.length > 0) {
                const brokenNames = faultyItems.map(i => i._debugName).join(', ');
                setToast({
                    message: `Cannot checkout! Invalid variant data: ${brokenNames}`,
                    type: 'error'
                });
                return;
            }

            const itemsToSend = formattedItems.map(({ _debugName, ...rest }) => rest);

            const success = await processPurchase({
                supplierId: selectedSupplier.id,
                totalAmount: grandTotal,
                subtotal: subtotal,
                taxAmount: Number(taxAmount || 0),
                courierCost: Number(courierCost || 0),
                grandTotal: grandTotal,
                paidAmount: Number(paidAmount || 0),
                dueAmount: dueAmount,
                items: itemsToSend
            });

            if (success) {
                // Soft success message
                setToast({
                    message: 'Purchase Order committed successfully',
                    type: 'success'
                });

                // Clear form so you can create the next PO immediately
                setCart([]);
                setTaxAmount(0);
                setCourierCost(0);
                setPaidAmount(0);
                // Optional: also clear selected supplier if you want
                // setSelectedSupplier(null);
            }
        } catch (err) {
            setToast({
                message: err.message || 'Commitment failed',
                type: 'error'
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#f9fafb] text-[#374151] font-sans w-full pb-12 overflow-x-hidden">

            {/* Soft Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            {/* Header Bar */}
            <div className="bg-white border-b border-gray-300 px-4 md:px-6 py-4 flex items-center w-full relative z-20 shadow-sm">
                <h1 className="text-lg md:text-xl font-semibold text-gray-800 tracking-tight flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#017E84]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    New Purchase Order
                </h1>
            </div>

            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 w-full flex flex-col xl:flex-row gap-6">

                {/* Left Column */}
                <div className="flex-1 space-y-6">

                    {/* Supplier Selection */}
                    <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full relative">
                        <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0"></div>
                        <div className="p-5 sm:p-6 pt-7 sm:pt-8">
                            <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                                Vendor / Supplier
                            </label>
                            <select
                                className="w-full border border-gray-300 rounded-sm px-4 py-3 bg-gray-50 text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#017E84]/50 focus:border-[#017E84] transition-all cursor-pointer appearance-none"
                                value={selectedSupplier?.id || ""}
                                onChange={handleSupplierChange}
                            >
                                <option value="" disabled>-- Select a Vendor --</option>
                                {suppliers?.map(s => (
                                    <option key={s.id} value={s.id}>{s.companyName || s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full relative">
                        <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0"></div>

                        <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 mt-1">
                            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Order Items</h3>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-[#017E84] hover:bg-[#01696e] text-white px-4 py-2 rounded-sm text-sm font-bold shadow-sm transition flex items-center gap-1.5 uppercase"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Product
                            </button>
                        </div>

                        {/* Mobile View */}
                        <div className="block md:hidden divide-y divide-gray-100">
                            {cart?.length > 0 ? cart.map((row) => (
                                <div key={row.id} className="p-4 bg-white space-y-3 relative hover:bg-teal-50/30 transition-colors">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="font-bold text-gray-800 text-sm leading-snug">{row.name}</div>
                                        <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-3 border-t border-gray-50 pt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Qty:</span>
                                            <input
                                                type="number"
                                                className="w-24 text-center border border-gray-300 rounded-sm px-2 py-1.5 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:border-[#017E84]"
                                                value={row.qty}
                                                onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Unit Price (৳):</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-28 text-right border border-gray-300 rounded-sm px-2 py-1.5 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:border-[#017E84]"
                                                value={row.price}
                                                onChange={(e) => updateRow(row.id, { price: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Total:</span>
                                            <span className="font-bold text-[#017E84]">৳{(row.qty * row.price).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-gray-400 text-sm italic">
                                    No products added to this order yet.
                                </div>
                            )}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block w-full overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                    <th className="p-4 pl-6 font-bold w-[40%]">Product Name</th>
                                    <th className="p-4 font-bold text-center w-[15%]">Qty</th>
                                    <th className="p-4 font-bold text-right w-[20%]">Unit Price (৳)</th>
                                    <th className="p-4 font-bold text-right w-[15%]">Total</th>
                                    <th className="p-4 pr-6 text-center w-[10%]">Action</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                {cart?.length > 0 ? cart.map((row) => (
                                    <tr key={row.id} className="hover:bg-teal-50/30 transition-colors group">
                                        <td className="p-4 pl-6 font-semibold text-gray-800 align-middle">{row.name}</td>
                                        <td className="p-4 text-center align-middle">
                                            <input
                                                type="number"
                                                className="w-20 mx-auto text-center border border-gray-300 rounded-sm px-2 py-1.5 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84] shadow-sm"
                                                value={row.qty}
                                                onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) })}
                                                min="1"
                                            />
                                        </td>
                                        <td className="p-4 text-right align-middle">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-28 text-right border border-gray-300 rounded-sm px-2 py-1.5 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84] shadow-sm"
                                                value={row.price}
                                                onChange={(e) => updateRow(row.id, { price: parseFloat(e.target.value) || 0 })}
                                            />
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-900 align-middle">
                                            ৳{(row.qty * row.price).toFixed(2)}
                                        </td>
                                        <td className="p-4 pr-6 text-center align-middle">
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                title="Remove Item"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-gray-400 text-sm italic">
                                            Your cart is empty. Click &quot;Add Product&quot; to begin building your PO.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column - Financial Summary */}
                <div className="w-full xl:w-[350px] shrink-0 xl:sticky xl:top-6 self-start space-y-6">
                    <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200 relative overflow-hidden">
                        <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0"></div>

                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-5 border-b border-gray-100 pb-3">
                            Financial Summary
                        </h3>

                        <div className="space-y-4 text-sm text-gray-600">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-500">Items in Cart</span>
                                <span className="font-bold text-gray-800">{cart?.length || 0}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-500">Subtotal</span>
                                <span className="font-bold text-gray-800">৳{subtotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <label className="font-medium text-gray-500 text-xs">VAT / Tax (৳)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-24 text-right border border-gray-300 rounded-sm px-2 py-1 text-sm focus:outline-none focus:border-[#017E84]"
                                    value={taxAmount}
                                    onChange={(e) => setTaxAmount(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-between items-center pt-1">
                                <label className="font-medium text-gray-500 text-xs">Courier Cost (৳)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-24 text-right border border-gray-300 rounded-sm px-2 py-1 text-sm focus:outline-none focus:border-[#017E84]"
                                    value={courierCost}
                                    onChange={(e) => setCourierCost(e.target.value)}
                                />
                            </div>

                            <div className="border-t border-dashed border-gray-300 pt-3 mt-3 flex justify-between items-end">
                                <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">Grand Total</span>
                                <span className="text-lg font-bold text-[#017E84]">৳{grandTotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center pt-3">
                                <label className="font-medium text-gray-500 text-xs">Advance (Paid) ৳</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-24 text-right border border-gray-300 rounded-sm px-2 py-1 text-sm text-green-700 font-bold focus:outline-none focus:border-green-500 bg-green-50"
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(e.target.value)}
                                />
                            </div>

                            <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-end">
                                <span className="text-sm font-bold text-red-600 uppercase tracking-wide">Balance Due</span>
                                <span className="text-xl font-bold text-red-600">৳{dueAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={loading || cart?.length === 0}
                            className={`w-full mt-8 py-3.5 rounded-sm text-sm font-bold uppercase tracking-wider transition-colors shadow-sm flex justify-center items-center gap-2
                                ${loading || cart?.length === 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#017E84] hover:bg-[#01696e] text-white shadow-md'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Commit Purchase Order
                                </>
                            )}
                        </button>

                        {!selectedSupplier && cart?.length > 0 && (
                            <p className="text-red-500 text-xs font-semibold text-center mt-3">
                                * Please select a vendor above
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <PurchaseItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAddItem={addRow}
                products={availableProducts}
            />
        </div>
    );
}