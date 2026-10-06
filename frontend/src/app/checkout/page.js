'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSales } from '../../features/purchase/hooks/useSales';
import { API_BASE } from '@/config/apiEndpoints';
import SalesItemModal from '@/features/sales/components/SalesItemModal';
import Toast from '@/components/ui/Toast';

// 🟢 REUSABLE CUSTOM SELECT COMPONENT
function CustomSelect({ value, onChange, options, placeholder, errorState }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between border ${errorState ? 'border-[#017E84] bg-teal-50/20' : 'border-gray-300'} rounded-sm px-3 py-2 text-sm focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] outline-none bg-white transition-all`}
            >
                <span className="truncate text-gray-700">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg className={`w-4 h-4 text-gray-500 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-xl z-50 max-h-56 overflow-y-auto">
                    <button
                        type="button"
                        onClick={() => { onChange(''); setIsOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 border-b border-gray-100"
                    >
                        {placeholder}
                    </button>
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-teal-50/60 ${String(value) === String(opt.value) ? 'bg-teal-50 font-semibold text-[#017E84]' : 'text-gray-700'}`}
                        >
                            <span className="block truncate">{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// 🟢 MAIN SALES ORDER COMPONENT
export default function SalesOrderPage() {
    const router = useRouter();
    const {
        cart, buyers, products, godowns,
        addRow, updateRow, removeRow,
        processCheckout, loading, clearCart, error,
        fetchInitialData
    } = useSales();

    const [selectedBuyerId, setSelectedBuyerId] = useState('');
    const [selectedGodownId, setSelectedGodownId] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    const [taxes, setTaxes] = useState([]);
    const [selectedTaxId, setSelectedTaxId] = useState('');
    const [selectedTaxRate, setSelectedTaxRate] = useState(0);
    const [selectedTaxName, setSelectedTaxName] = useState('');

    // 🟢 Courier Cost & Advance Paid States
    const [courierCost, setCourierCost] = useState(0);
    const [advancePaid, setAdvancePaid] = useState(0);

    // 🟢 NEW: Product Modal state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const pendingAddRef = useRef(null);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // ===== BARCODE SCANNER REFS =====
    const scanBufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);

    useEffect(() => {
        const loadSavedSettings = async () => {
            const savedGodown = localStorage.getItem('defaultGodownId');
            if (savedGodown) {
                setSelectedGodownId(savedGodown);
            }
        };
        loadSavedSettings();
    }, []);

    useEffect(() => {
        const fetchTaxes = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/settings/taxes`);
                if (!res.ok) return;
                const data = await res.json();

                const taxList = Array.isArray(data) ? data : (data.data || []);
                setTaxes(taxList);

                const savedTaxId = localStorage.getItem('defaultTaxId');

                if (savedTaxId && taxList.some(t => String(t.id) === savedTaxId)) {
                    const foundTax = taxList.find(t => String(t.id) === savedTaxId);
                    setSelectedTaxId(String(foundTax.id));
                    setSelectedTaxRate(Number(foundTax.percentage));
                    setSelectedTaxName(foundTax.name);
                } else if (taxList.length > 0) {
                    setSelectedTaxId(String(taxList[0].id));
                    setSelectedTaxRate(Number(taxList[0].percentage));
                    setSelectedTaxName(taxList[0].name);
                }
            } catch (err) {
                console.error("Failed to fetch taxes:", err);
            }
        };
        fetchTaxes();
    }, []);

    // 🟢 Handle pending product add after addRow creates a new empty row
    useEffect(() => {
        if (pendingAddRef.current && cart.length > 0) {
            const lastRow = cart[cart.length - 1];
            if (lastRow && !lastRow.productVariantId) {
                const item = pendingAddRef.current;
                updateRow(lastRow.id, {
                    productVariantId: item.id,
                    name: item.productName + (item.variantName ? ` (${item.variantName})` : ''),
                    price: item.price,
                    qty: 1,
                    discount: 0
                });
                pendingAddRef.current = null;
            }
        }
    }, [cart, updateRow]);

    const safeNum = (val) => (isNaN(Number(val)) ? 0 : Number(val));

    // 🟢 FINANCIAL CALCULATIONS
    const subtotal = cart.reduce((acc, item) => acc + (safeNum(item.qty) * safeNum(item.price)), 0);
    const totalDiscount = cart.reduce((acc, item) => acc + safeNum(item.discount), 0);

    const tax = Math.max(0, (subtotal - totalDiscount) * (selectedTaxRate / 100));
    const courier = safeNum(courierCost);
    const advance = safeNum(advancePaid);

    const grandTotal = Math.max(0, subtotal - totalDiscount + tax + courier);
    const dueAmount = Math.max(0, grandTotal - advance);

    const hasStockIssue = cart.some(item => {
        if (!item.productVariantId) return false;
        let activeStock = 0;

        for (const prod of (products || [])) {
            const variant = prod.variants?.find(v => String(v.id) === String(item.productVariantId));
            if (variant) {
                if (selectedGodownId) {
                    const wh = variant.warehouses?.find(w => String(w.godownId) === String(selectedGodownId));
                    activeStock = wh ? wh.availableQty : 0;
                } else {
                    activeStock = variant.totalAvailable || 0;
                }
                break;
            }
        }
        return safeNum(item.qty) > safeNum(activeStock);
    });

    const handleAddItemFromModal = useCallback((item) => {
        const existingRow = cart.find(c => String(c.productVariantId) === String(item.id));
        if (existingRow) {
            const currentQty = Number(existingRow.qty) || 0;
            updateRow(existingRow.id, { qty: currentQty + 1 });
        } else {
            const emptyRow = cart.find(c => !c.productVariantId);
            if (emptyRow) {
                updateRow(emptyRow.id, {
                    productVariantId: item.id,
                    name: item.productName + (item.variantName ? ` (${item.variantName})` : ''),
                    price: item.price,
                    qty: 1,
                    discount: 0
                });
            } else {
                pendingAddRef.current = item;
                addRow();
            }
        }
        setIsProductModalOpen(false);
    }, [cart, updateRow, addRow]);

    // ===== STRONG BARCODE SCANNER =====
    const handleBarcodeScan = useCallback((code) => {
        const scanned = code.trim();
        console.log('%c SCANNED:', 'background:#017E84;color:white;padding:2px 6px', scanned);

        if (!scanned) return;

        // ========== BOTTLE BARCODE → Keyboard1101 ==========
        if (scanned === '8906105101265') {
            let found = null;

            for (const p of (products || [])) {
                const name = (p.name || '').toLowerCase();
                const sku = (p.sku || '').toUpperCase();

                if (sku.includes('KEYB') || name.includes('keyboard')) {
                    // Prefer first variant if exists
                    if (p.variants && p.variants.length > 0) {
                        const v = p.variants[0];
                        found = {
                            id: v.id,
                            productName: p.name,
                            variantName: v.name,
                            price: v.price ?? v.sellingPrice ?? 0,
                        };
                    } else {
                        found = {
                            id: p.id,
                            productName: p.name,
                            price: p.price ?? p.sellingPrice ?? 0,
                        };
                    }
                    break;
                }

                // Check variants
                if (p.variants) {
                    for (const v of p.variants) {
                        if (
                            (v.sku || '').toUpperCase().includes('KEYB') ||
                            (v.name || '').toLowerCase().includes('keyboard')
                        ) {
                            found = {
                                id: v.id,
                                productName: p.name,
                                variantName: v.name,
                                price: v.price ?? v.sellingPrice ?? 0,
                            };
                            break;
                        }
                    }
                }
                if (found) break;
            }

            // Fallback temporary product
            if (!found) {
                found = {
                    id: 'temp-keyboard-001',
                    productName: 'Keyboard1101 (Test from Bottle)',
                    price: 1500,
                };
                console.warn('Real Keyboard1101 not found → using temporary product');
            }

            handleAddItemFromModal(found);
            setToast({
                message: `Bottle scanned → ${found.productName}${found.variantName ? ` (${found.variantName})` : ''}`,
                type: 'success',
            });
            return;
        }

        // ===== Normal barcode / SKU search =====
        let found = null;

        for (const p of (products || [])) {
            if (p.sku === scanned || p.barcode === scanned || String(p.id) === scanned) {
                if (p.variants && p.variants.length > 0) {
                    const v = p.variants[0];
                    found = {
                        id: v.id,
                        productName: p.name,
                        variantName: v.name,
                        price: v.price ?? v.sellingPrice ?? 0,
                    };
                } else {
                    found = {
                        id: p.id,
                        productName: p.name,
                        price: p.price ?? p.sellingPrice ?? 0,
                    };
                }
                break;
            }

            if (p.variants) {
                for (const v of p.variants) {
                    if (v.sku === scanned || v.barcode === scanned || String(v.id) === scanned) {
                        found = {
                            id: v.id,
                            productName: p.name,
                            variantName: v.name,
                            price: v.price ?? v.sellingPrice ?? 0,
                        };
                        break;
                    }
                }
            }
            if (found) break;
        }

        if (found) {
            handleAddItemFromModal(found);
            setToast({
                message: `Scanned: ${found.productName}${found.variantName ? ` (${found.variantName})` : ''}`,
                type: 'success',
            });
        } else {
            setToast({
                message: `Product not found: ${scanned}`,
                type: 'error',
            });
        }
    }, [products, handleAddItemFromModal]);

    // Scanner listener
    useEffect(() => {
        const onKeyDown = (e) => {
            const now = Date.now();
            const timeDiff = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

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

            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                scanBufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [handleBarcodeScan]);

    const handleProcessOrder = async () => {
        if (!selectedGodownId) {
            setToast({ message: 'Please select a Dispatch Location (Godown)', type: 'error' });
            return;
        }
        if (!selectedBuyerId) {
            setToast({ message: 'Please select a customer', type: 'error' });
            return;
        }
        if (cart.length === 0) {
            setToast({ message: 'Cart is empty', type: 'error' });
            return;
        }
        if (cart.some(item => !item.productVariantId)) {
            setToast({ message: 'Please select a product for all rows', type: 'error' });
            return;
        }
        if (hasStockIssue) {
            setToast({ message: 'Insufficient stock in the selected Location!', type: 'error' });
            return;
        }

        const success = await processCheckout({
            buyerId: selectedBuyerId,
            godownId: selectedGodownId,
            notes,
            paymentMethod,
            taxId: selectedTaxId || null,
            taxName: selectedTaxName,
            taxRate: selectedTaxRate,
            taxAmount: tax,
            courierCost: courier,
            advancePaid: advance,
            dueAmount: dueAmount,
            totalAmount: grandTotal,
            items: cart
        });

        if (success) {
            setToast({
                message: 'Sales Order processed successfully! Stock allocated.',
                type: 'success'
            });

            clearCart();
            setSelectedBuyerId('');
            setNotes('');
            setCourierCost(0);
            setAdvancePaid(0);

            if (typeof fetchInitialData === 'function') {
                await fetchInitialData();
            }
        }
    };

    const handleClearCartAndFields = () => {
        clearCart();
        setCourierCost(0);
        setAdvancePaid(0);
    };

    const handleNumberInput = (id, field, value) => {
        const val = value === '' ? '' : Number(value);
        updateRow(id, { [field]: val });
    };

    const buyerOptions = buyers?.map(b => ({
        value: b.id,
        label: `${b.companyName || b.name} ${b.accountNo ? `(${b.accountNo})` : ''}`
    })) || [];

    const godownOptions = godowns?.map(g => ({
        value: g.id,
        label: g.name
    })) || [];

    const paymentOptions = [
        { value: 'CASH', label: 'Immediate Payment (Cash)' },
        { value: 'UPI', label: 'UPI' },
        { value: 'CARD', label: 'Credit/Debit Card' },
        { value: 'CREDIT', label: 'Store Credit' }
    ];

    const taxOptions = [
        { value: '', label: 'No Tax (0%)' },
        ...taxes.map(t => ({
            value: t.id,
            label: `${t.name} (${t.percentage}%)`
        }))
    ];

    const getProductDisplay = (row) => {
        if (!row.productVariantId) {
            return { sku: '', name: 'No product selected', variantName: '' };
        }
        if (row.name) {
            return { sku: '', name: row.name, variantName: '' };
        }
        for (const prod of (products || [])) {
            const variant = prod.variants?.find(v => String(v.id) === String(row.productVariantId));
            if (variant) {
                return {
                    sku: variant.sku || '',
                    name: prod.name,
                    variantName: variant.name && variant.name !== prod.name ? variant.name : ''
                };
            }
        }
        return { sku: '', name: 'Unknown product', variantName: '' };
    };

    return (
        <div className="min-h-screen bg-[#f9fafb] text-[#374151] font-sans relative w-full overflow-x-hidden pb-12">
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            {/* Header Bar */}
            <div className="bg-white border-b border-gray-300 px-4 md:px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center w-full relative z-20">
                <div className="flex items-center gap-3 mb-3 md:mb-0">
                    <h1 className="text-lg md:text-xl font-semibold text-gray-800 tracking-tight">New Sales Order</h1>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold uppercase rounded-sm">Draft</span>
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500 ml-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Scanner Ready
                    </span>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={handleClearCartAndFields}
                        disabled={cart.length === 0}
                        className="flex-1 md:flex-none px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-sm text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleProcessOrder}
                        disabled={loading || cart.length === 0 || !selectedBuyerId || !selectedGodownId || hasStockIssue}
                        className="flex-1 md:flex-none px-6 py-2 bg-[#017E84] hover:bg-[#01696e] disabled:bg-gray-400 text-white rounded-sm text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
                    >
                        {loading ? 'Processing...' : 'Confirm Order'}
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-4 md:py-6 px-2 sm:px-4 lg:px-8 w-full">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-sm flex items-center">
                        <span className="font-bold mr-2">Error:</span> {error}
                    </div>
                )}

                <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full">
                    <div className="h-1 bg-[#017E84] w-full"></div>

                    {/* Customer & Location Form */}
                    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-4 md:gap-y-6 border-b border-gray-200">
                        <div className="space-y-4 md:space-y-6 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 w-full">
                                <label className="w-full sm:w-[140px] shrink-0 text-sm font-bold text-gray-700">
                                    Customer
                                </label>
                                <div className="flex-1 min-w-0 w-full">
                                    <CustomSelect
                                        value={selectedBuyerId}
                                        onChange={setSelectedBuyerId}
                                        options={buyerOptions}
                                        placeholder="-- Select Customer --"
                                        errorState={!selectedBuyerId}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 w-full">
                                <label className="w-full sm:w-[140px] shrink-0 text-sm font-bold text-gray-700">
                                    Dispatch Godown
                                </label>
                                <div className="flex-1 min-w-0 w-full">
                                    <CustomSelect
                                        value={selectedGodownId}
                                        onChange={(val) => {
                                            setSelectedGodownId(val);
                                            localStorage.setItem('defaultGodownId', val);
                                        }}
                                        options={godownOptions}
                                        placeholder="-- Select Godown --"
                                        errorState={!selectedGodownId}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 md:space-y-6 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 w-full">
                                <label className="w-full sm:w-[140px] shrink-0 text-sm font-bold text-gray-700">
                                    Payment Terms
                                </label>
                                <div className="flex-1 min-w-0 w-full">
                                    <CustomSelect
                                        value={paymentMethod}
                                        onChange={setPaymentMethod}
                                        options={paymentOptions}
                                        placeholder="-- Select Payment Method --"
                                        errorState={false}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 w-full">
                                <label className="w-full sm:w-[140px] shrink-0 text-sm font-bold text-gray-700">
                                    Tax / VAT
                                </label>
                                <div className="flex-1 min-w-0 w-full">
                                    <CustomSelect
                                        value={selectedTaxId}
                                        onChange={(val) => {
                                            setSelectedTaxId(val);
                                            localStorage.setItem('defaultTaxId', val);
                                            const foundTax = taxes.find(t => String(t.id) === String(val));
                                            setSelectedTaxRate(foundTax ? Number(foundTax.percentage) : 0);
                                            setSelectedTaxName(foundTax ? foundTax.name : '');
                                        }}
                                        options={taxOptions}
                                        placeholder="-- Select Tax --"
                                        errorState={false}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Lines Header */}
                    <div className="bg-gray-50/50 px-4 md:px-6 pt-4 border-b border-gray-200">
                        <span className="inline-block border-b-2 border-[#017E84] pb-2 text-sm font-bold text-[#017E84]">Order Lines</span>
                    </div>

                    {/* 📱 MOBILE VIEW: Cards */}
                    <div className="block md:hidden divide-y divide-gray-200">
                        {cart.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No order lines defined. Click &quot;Add a product&quot; or scan a barcode.
                            </div>
                        ) : (
                            cart.map((row, index) => {
                                let activeStock = 0;
                                if (row.productVariantId) {
                                    for (const prod of (products || [])) {
                                        const variant = prod.variants?.find(v => String(v.id) === String(row.productVariantId));
                                        if (variant) {
                                            if (selectedGodownId) {
                                                const wh = variant.warehouses?.find(w => String(w.godownId) === String(selectedGodownId));
                                                activeStock = wh ? wh.availableQty : 0;
                                            } else {
                                                activeStock = variant.totalAvailable || 0;
                                            }
                                            break;
                                        }
                                    }
                                }

                                const isOverStock = row.productVariantId ? safeNum(row.qty) > safeNum(activeStock) : false;
                                const rowTotal = (safeNum(row.qty) * safeNum(row.price)) - safeNum(row.discount);
                                const display = getProductDisplay(row);

                                return (
                                    <div key={row.id} className="p-4 bg-white space-y-3 relative">
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                            <span className="text-xs font-bold text-[#017E84]">Item #{index + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                className="text-gray-400 hover:text-red-500 font-bold p-1 text-sm rounded transition-colors"
                                            >
                                                ✕ Remove
                                            </button>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Product / Code</label>
                                            <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200 rounded-sm px-2.5 py-1.5 text-xs sm:text-sm w-full">
                                                <div className="flex items-center gap-1.5 overflow-hidden w-full">
                                                    {display.sku && (
                                                        <span className="font-mono text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                                                            {display.sku}
                                                        </span>
                                                    )}
                                                    <span className="font-medium text-gray-900 truncate text-xs sm:text-sm">
                                                        {display.name}
                                                    </span>
                                                </div>
                                            </div>
                                            {isOverStock && <p className="text-[10px] text-red-600 font-semibold mt-1">Qty exceeds stock.</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Available Stock</label>
                                                <div className={`text-xs py-1.5 font-semibold ${activeStock <= 0 ? (row.productVariantId ? 'text-red-500' : 'text-gray-400') : 'text-gray-700'}`}>
                                                    {row.productVariantId ? (activeStock > 0 ? activeStock.toLocaleString() : '0') : '-'}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Quantity</label>
                                                <div className="flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const current = Number(row.qty) || 1;
                                                            if (current > 1) handleNumberInput(row.id, 'qty', current - 1);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-l hover:bg-gray-200 text-gray-700 font-bold text-sm"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className={`w-full h-8 text-center bg-white border-y border-gray-300 py-1 text-sm outline-none font-medium ${isOverStock ? 'text-red-600 font-bold' : ''}`}
                                                        value={row.qty ?? ''}
                                                        onChange={(e) => handleNumberInput(row.id, 'qty', e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const current = Number(row.qty) || 0;
                                                            handleNumberInput(row.id, 'qty', current + 1);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-r hover:bg-gray-200 text-gray-700 font-bold text-sm"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Unit Price (৳)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-[#017E84]"
                                                    value={row.price ?? 0}
                                                    onChange={(e) => handleNumberInput(row.id, 'price', e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Discount (৳)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-[#017E84]"
                                                    value={row.discount ?? 0}
                                                    onChange={(e) => handleNumberInput(row.id, 'discount', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
                                            <span className="font-semibold text-gray-500">Subtotal:</span>
                                            <span className="font-bold text-gray-900 text-sm">৳{rowTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* 🖥️ DESKTOP VIEW: Order Lines Table */}
                    <div className="hidden md:block w-full overflow-x-auto min-h-[180px]">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                            <tr className="border-b-2 border-gray-300 bg-gray-50 text-gray-700 text-xs uppercase">
                                <th className="p-2 font-bold w-[34%] pl-6">Product / Code</th>
                                <th className="p-2 font-bold w-[11%] text-right">Available</th>
                                <th className="p-2 font-bold w-[13%] text-right">Quantity</th>
                                <th className="p-2 font-bold w-[13%] text-right">Unit Price</th>
                                <th className="p-2 font-bold w-[10%] text-right">Disc.</th>
                                <th className="p-2 font-bold w-[13%] text-right">Subtotal</th>
                                <th className="p-2 w-[6%] pr-6 text-center"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                            {cart.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">
                                        No order lines defined. Click &quot;Add a product&quot; or scan a barcode.
                                    </td>
                                </tr>
                            ) : (
                                cart.map((row) => {
                                    let activeStock = 0;
                                    if (row.productVariantId) {
                                        for (const prod of (products || [])) {
                                            const variant = prod.variants?.find(v => String(v.id) === String(row.productVariantId));
                                            if (variant) {
                                                if (selectedGodownId) {
                                                    const wh = variant.warehouses?.find(w => String(w.godownId) === String(selectedGodownId));
                                                    activeStock = wh ? wh.availableQty : 0;
                                                } else {
                                                    activeStock = variant.totalAvailable || 0;
                                                }
                                                break;
                                            }
                                        }
                                    }

                                    const isOverStock = row.productVariantId ? safeNum(row.qty) > safeNum(activeStock) : false;
                                    const rowTotal = (safeNum(row.qty) * safeNum(row.price)) - safeNum(row.discount);
                                    const display = getProductDisplay(row);

                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-2 pl-6 align-top pt-3">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    {display.sku && (
                                                        <span className="font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                                                            {display.sku}
                                                        </span>
                                                    )}
                                                    <span className="font-medium text-gray-900 truncate text-sm">
                                                        {display.name}
                                                    </span>
                                                </div>
                                                {isOverStock && <p className="text-[10px] text-red-600 font-semibold mt-1">Qty exceeds stock.</p>}
                                            </td>
                                            <td className={`p-2 text-right align-top pt-4 ${activeStock <= 0 ? (row.productVariantId ? 'text-red-500 font-bold' : 'text-gray-400') : 'text-gray-700 font-medium'}`}>
                                                {row.productVariantId ? (activeStock > 0 ? activeStock.toLocaleString() : '0') : '-'}
                                            </td>
                                            <td className="p-2 align-top pt-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className={`w-full min-w-[55px] text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-[#017E84] focus:bg-white rounded-sm py-1 px-1 text-sm outline-none transition-all ${isOverStock ? 'text-red-600 font-bold' : ''}`}
                                                    value={row.qty ?? ''}
                                                    onChange={(e) => handleNumberInput(row.id, 'qty', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2 align-top pt-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full min-w-[65px] text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-[#017E84] focus:bg-white rounded-sm py-1 px-2 text-sm outline-none transition-all"
                                                    value={row.price ?? 0}
                                                    onChange={(e) => handleNumberInput(row.id, 'price', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2 align-top pt-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full min-w-[50px] text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-[#017E84] focus:bg-white rounded-sm py-1 px-2 text-sm outline-none transition-all"
                                                    value={row.discount ?? 0}
                                                    onChange={(e) => handleNumberInput(row.id, 'discount', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2 text-right font-bold text-gray-800 align-top pt-4">
                                                ৳{rowTotal.toFixed(2)}
                                            </td>
                                            <td className="p-2 pr-6 text-center align-top pt-4">
                                                <button onClick={() => removeRow(row.id)} className="text-gray-400 hover:text-red-500 font-bold px-1.5 py-0.5 rounded transition-colors" title="Remove row">
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* ➕ ADD A PRODUCT ACTION BAR */}
                    <div className="p-3 md:px-6 md:py-3 bg-gray-50/80 border-t border-gray-200 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setIsProductModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#017E84] hover:text-[#01696e] hover:bg-teal-50 px-3 py-1.5 rounded transition-colors border border-dashed border-[#017E84]/40 hover:border-[#017E84]"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            Add a product
                        </button>
                    </div>

                    {/* 📊 ORDER SUMMARY FOOTER */}
                    <div className="p-4 md:p-6 bg-gray-50/30 border-t border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div className="w-full md:w-1/2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Internal Notes</label>
                            <textarea
                                rows="3"
                                placeholder="Add order terms, delivery instructions..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full border border-gray-300 rounded-sm p-2 text-xs sm:text-sm focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] outline-none bg-white"
                            />
                        </div>

                        <div className="w-full md:w-80 space-y-2 text-xs sm:text-sm border-t md:border-t-0 pt-3 md:pt-0 border-gray-200">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span className="font-semibold">৳{subtotal.toFixed(2)}</span>
                            </div>

                            {totalDiscount > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                    <span>Total Discount:</span>
                                    <span className="font-semibold">-৳{totalDiscount.toFixed(2)}</span>
                                </div>
                            )}

                            {selectedTaxRate > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>{selectedTaxName || 'Tax'} ({selectedTaxRate}%):</span>
                                    <span className="font-semibold">৳{tax.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center gap-2 text-gray-700 pt-1">
                                <span className="font-medium">Courier Cost (+):</span>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        value={courierCost}
                                        onChange={(e) => setCourierCost(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-24 text-right bg-white border border-gray-300 rounded px-2 py-0.5 text-xs font-semibold focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between text-sm sm:text-base font-bold text-gray-900 border-t border-gray-300 pt-2">
                                <span>Grand Total:</span>
                                <span className="text-[#017E84]">৳{grandTotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center gap-2 text-emerald-800 bg-emerald-50/70 p-1.5 rounded border border-emerald-200 mt-1">
                                <span className="font-semibold text-xs">Advance Paid (-):</span>
                                <input
                                    type="number"
                                    min="0"
                                    max={grandTotal}
                                    value={advancePaid}
                                    onChange={(e) => setAdvancePaid(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-24 text-right bg-white border border-emerald-300 rounded px-2 py-0.5 text-xs font-bold text-emerald-700 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div className="flex justify-between items-center text-sm sm:text-base font-extrabold text-red-600 bg-red-50 p-2 rounded border border-red-200 mt-1">
                                <span>Due Amount:</span>
                                <span>৳{dueAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* 🟢 PRODUCT SELECTOR MODAL */}
            <SalesItemModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onAddItem={handleAddItemFromModal}
                products={products}
                selectedGodownId={selectedGodownId}
            />
        </div>
    );
}