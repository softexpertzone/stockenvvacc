'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { hasPermission, PERMISSIONS } from '@/config/permissions';
import SalesItemModal from '@/features/sales/components/SalesItemModal';
import Toast from '@/components/ui/Toast';

export default function SalesCheckoutPage() {
    const router = useRouter();

    const [userRole, setUserRole] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [receivedAmount, setReceivedAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Soft toast
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // Scanner refs
    const scanBufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);

    // Load user role
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (!cancelled) setUserRole(user?.role || null);
            } catch {
                if (!cancelled) setUserRole(null);
            }
        }, 0);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, []);

    // Protect page
    useEffect(() => {
        if (userRole && !hasPermission(userRole, [PERMISSIONS.SALES_CREATE])) {
            router.replace('/sales/orders');
        }
    }, [userRole, router]);

    // Load customers + products
    useEffect(() => {
        const loadData = async () => {
            try {
                const [custRes, prodRes] = await Promise.all([
                    apiClient.get('/partners?type=BUYER'),
                    apiClient.get('/catalog/products?limit=500'),
                ]);

                const custList =
                    custRes.data?.data?.data || custRes.data?.data || custRes.data || [];
                setCustomers(Array.isArray(custList) ? custList : []);

                const prodList =
                    prodRes.data?.data?.data || prodRes.data?.data || prodRes.data || [];
                setProducts(Array.isArray(prodList) ? prodList : []);
            } catch (err) {
                console.error(err);
                setToast({ message: 'Failed to load data', type: 'error' });
            }
        };
        loadData();
    }, []);

    // ===== addToCart =====
    const addToCart = useCallback((product) => {
        const id = product.id || product.variantId || product.rawVariant?.id;
        const name = product.productName
            ? `${product.productName}${product.variantName ? ` (${product.variantName})` : ''}`
            : product.name || product.sku || 'Unknown';

        const unitPrice = Number(
            product.price ?? product.sellingPrice ?? product.unitPrice ?? 0
        );

        setCart((prevCart) => {
            const existing = prevCart.find((item) => item.productVariantId === id);

            if (existing) {
                return prevCart.map((item) =>
                    item.productVariantId === id
                        ? { ...item, quantityCount: item.quantityCount + 1 }
                        : item
                );
            }

            return [
                ...prevCart,
                {
                    productVariantId: id,
                    name,
                    unitPrice,
                    quantityCount: 1,
                    rackId: null,
                },
            ];
        });

        setIsModalOpen(false);
    }, []);

    // ===== STRONG BARCODE SCANNER =====
    const handleBarcodeScan = useCallback((code) => {
        const scanned = code.trim();
        console.log('%c SCANNED CODE:', 'background: #017E84; color: white; padding: 2px 6px', scanned);

        if (!scanned) return;

        // ========== BOTTLE BARCODE FORCE MAPPING ==========
        if (scanned === '8906105101265') {
            let found = null;

            // Try to find real Keyboard1101
            for (const p of products) {
                const name = (p.name || '').toLowerCase();
                const sku = (p.sku || '').toUpperCase();

                if (sku.includes('KEYB') || name.includes('keyboard') || name.includes('keyboard1101')) {
                    found = p;
                    break;
                }

                const variants = p.productVariants || p.variants || [];
                for (const v of variants) {
                    if (
                        (v.sku || '').toUpperCase().includes('KEYB') ||
                        (v.name || '').toLowerCase().includes('keyboard')
                    ) {
                        found = {
                            id: v.id,
                            variantId: v.id,
                            productName: p.name,
                            variantName: v.name,
                            price: v.price ?? v.sellingPrice ?? 0,
                            rawVariant: v,
                            product: p,
                        };
                        break;
                    }
                }
                if (found) break;
            }

            // Fallback temporary product (so you can always test)
            if (!found) {
                found = {
                    id: 'temp-keyboard-001',
                    variantId: 'temp-keyboard-001',
                    productName: 'Keyboard1101 (Test from Bottle)',
                    name: 'Keyboard1101 (Test from Bottle)',
                    price: 1500,
                    unitPrice: 1500,
                };
                console.warn('Real Keyboard1101 not found → using temporary product');
            }

            addToCart(found);
            setToast({
                message: `Bottle scanned → ${found.productName || found.name}`,
                type: 'success',
            });
            return;
        }

        // ===== Normal barcode search =====
        let found = null;

        for (const p of products) {
            if (
                p.sku === scanned ||
                p.barcode === scanned ||
                String(p.id) === scanned
            ) {
                found = p;
                break;
            }

            const variants = p.productVariants || p.variants || [];
            for (const v of variants) {
                if (
                    v.sku === scanned ||
                    v.barcode === scanned ||
                    String(v.id) === scanned
                ) {
                    found = {
                        id: v.id,
                        variantId: v.id,
                        productName: p.name,
                        variantName: v.name,
                        price: v.price ?? v.sellingPrice,
                        rawVariant: v,
                        product: p,
                    };
                    break;
                }
            }
            if (found) break;
        }

        if (found) {
            addToCart(found);
            setToast({
                message: `Scanned: ${found.productName || found.name || scanned}`,
                type: 'success',
            });
        } else {
            setToast({
                message: `Product not found: ${scanned}`,
                type: 'error',
            });
        }
    }, [products, addToCart]);

    // Scanner listener (capture phase – more reliable)
    useEffect(() => {
        const onKeyDown = (e) => {
            const now = Date.now();
            const timeDiff = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            // Reset if human typing (slow)
            if (timeDiff > 70) {
                scanBufferRef.current = '';
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                const code = scanBufferRef.current.trim();
                scanBufferRef.current = '';

                if (code.length >= 4) {
                    handleBarcodeScan(code);
                }
                return;
            }

            // Collect characters from scanner
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                scanBufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [handleBarcodeScan]);

    const updateQty = (index, value) => {
        const newCart = [...cart];
        newCart[index].quantityCount = Math.max(1, parseInt(value) || 1);
        setCart(newCart);
    };

    const removeItem = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const totalAmount = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.unitPrice * item.quantityCount, 0);
    }, [cart]);

    const handleCheckout = async () => {
        if (!selectedCustomer) {
            setToast({ message: 'Please select a customer', type: 'error' });
            return;
        }
        if (cart.length === 0) {
            setToast({ message: 'Cart is empty', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customerId: selectedCustomer,
                receivedAmount: parseFloat(receivedAmount) || 0,
                paymentMethod: 'CASH',
                items: cart.map((item) => ({
                    productVariantId: item.productVariantId,
                    rackId: item.rackId || null,
                    quantityCount: item.quantityCount,
                    quantityKg: 0,
                    unitPrice: item.unitPrice,
                })),
            };

            await apiClient.post('/sales/checkout', payload);

            setToast({
                message: 'Sale completed successfully',
                type: 'success',
            });

            setCart([]);
            setReceivedAmount('');
            setSelectedCustomer('');
        } catch (err) {
            setToast({
                message:
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    err.message ||
                    'Checkout failed',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f9fafb] text-[#374151] font-sans w-full pb-12 overflow-x-hidden">

            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            {/* Header */}
            <div className="bg-white border-b border-gray-300 px-4 md:px-6 py-4 flex items-center justify-between w-full relative z-20 shadow-sm">
                <h1 className="text-lg md:text-xl font-semibold text-gray-800 tracking-tight flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#017E84]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Sales Checkout
                </h1>

                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Scanner Ready (Zebex)
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 w-full flex flex-col xl:flex-row gap-6">

                {/* Left Column */}
                <div className="flex-1 space-y-6">

                    {/* Customer Selection */}
                    <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full relative">
                        <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0"></div>
                        <div className="p-5 sm:p-6 pt-7 sm:pt-8">
                            <label className="block text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                                Customer / Buyer
                            </label>
                            <select
                                className="w-full border border-gray-300 rounded-sm px-4 py-3 bg-gray-50 text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#017E84]/50 focus:border-[#017E84] transition-all"
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                            >
                                <option value="">-- Select a Customer --</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.companyName || c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Cart Items */}
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

                        {/* Desktop Table */}
                        <div className="hidden md:block w-full overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                    <th className="p-4 pl-6 font-bold w-[45%]">Product</th>
                                    <th className="p-4 font-bold text-center w-[15%]">Qty</th>
                                    <th className="p-4 font-bold text-right w-[20%]">Unit Price</th>
                                    <th className="p-4 font-bold text-right w-[15%]">Total</th>
                                    <th className="p-4 pr-6 text-center w-[5%]"></th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                {cart.length > 0 ? (
                                    cart.map((item, index) => (
                                        <tr key={index} className="hover:bg-teal-50/30 transition-colors">
                                            <td className="p-4 pl-6 font-semibold text-gray-800">{item.name}</td>
                                            <td className="p-4 text-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-20 text-center border border-gray-300 rounded-sm px-2 py-1.5 font-bold text-sm focus:outline-none focus:border-[#017E84]"
                                                    value={item.quantityCount}
                                                    onChange={(e) => updateQty(index, e.target.value)}
                                                />
                                            </td>
                                            <td className="p-4 text-right font-medium">
                                                ৳{item.unitPrice.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-900">
                                                ৳{(item.unitPrice * item.quantityCount).toFixed(2)}
                                            </td>
                                            <td className="p-4 pr-6 text-center">
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-gray-400 text-sm italic">
                                            No products added yet. Click “Add Product” or scan a barcode.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="block md:hidden divide-y divide-gray-100">
                            {cart.length > 0 ? (
                                cart.map((item, index) => (
                                    <div key={index} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-sm text-gray-800">{item.name}</div>
                                            <button onClick={() => removeItem(index)} className="text-red-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Qty</span>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-20 text-center border border-gray-300 rounded-sm px-2 py-1 font-bold"
                                                value={item.quantityCount}
                                                onChange={(e) => updateQty(index, e.target.value)}
                                            />
                                        </div>
                                        <div className="flex justify-between text-sm font-bold text-[#017E84]">
                                            <span>Total</span>
                                            <span>৳{(item.unitPrice * item.quantityCount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-400 text-sm italic">
                                    No products added yet. Scan a barcode or click Add Product.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Summary */}
                <div className="w-full xl:w-[350px] shrink-0 xl:sticky xl:top-6 self-start">
                    <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200 relative overflow-hidden">
                        <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0"></div>

                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-5 border-b border-gray-100 pb-3">
                            Order Summary
                        </h3>

                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Items</span>
                                <span className="font-bold">{cart.length}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-bold">৳{totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="border-t border-dashed border-gray-300 pt-3 mt-3 flex justify-between items-end">
                                <span className="text-sm font-bold text-gray-800 uppercase">Grand Total</span>
                                <span className="text-lg font-bold text-[#017E84]">৳{totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="pt-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Received Amount (৳)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm font-bold text-green-700 bg-green-50 focus:outline-none focus:border-green-500"
                                    value={receivedAmount}
                                    onChange={(e) => setReceivedAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={loading || cart.length === 0}
                            className={`w-full mt-8 py-3.5 rounded-sm text-sm font-bold uppercase tracking-wider transition-colors shadow-sm flex justify-center items-center gap-2
                                ${loading || cart.length === 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#017E84] hover:bg-[#01696e] text-white shadow-md'
                            }`}
                        >
                            {loading ? 'Processing...' : 'Complete Sale'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Selection Modal */}
            <SalesItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAddItem={addToCart}
                products={products}
            />
        </div>
    );
}