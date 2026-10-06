'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { Package, ArrowRightLeft, Search, Plus, Trash2, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function StockTransferPage() {
    const router = useRouter();

    // --- STATE ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Master Data
    const [godowns, setGodowns] = useState([]);
    const [products, setProducts] = useState([]);
    const [stockLedger, setStockLedger] = useState([]);

    // UI State
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [softAlert, setSoftAlert] = useState({ show: false, message: '' });

    // Transfer Cart
    const [transferItems, setTransferItems] = useState([]);
    const [destinationGodownId, setDestinationGodownId] = useState('');

    // Smart Pick (FIFO) Modal State
    const [isSmartPickOpen, setIsSmartPickOpen] = useState(false);
    const [smartPick, setSmartPick] = useState({
        productVariantId: '',
        sourceGodownId: '',
        qty: 1
    });

    const showSoftAlert = (message) => {
        setSoftAlert({ show: true, message });
        setTimeout(() => setSoftAlert({ show: false, message: '' }), 4500);
    };

    // Available qty for a product in a godown (flexible field matching)
    // Returns { found: boolean, qty: number }
    const getAvailableQty = (productVariantId, godownId) => {
        if (!productVariantId || !godownId || !Array.isArray(stockLedger)) {
            return { found: false, qty: 0 };
        }

        const matches = stockLedger.filter(l => {
            const rowVariant =
                l.productVariantId ?? l.variantId ?? l.productId ?? l.skuId ?? '';
            const rowGodown =
                l.godownId ?? l.warehouseId ?? l.sourceGodownId ?? l.locationId ?? '';
            return (
                String(rowVariant) === String(productVariantId) &&
                String(rowGodown) === String(godownId)
            );
        });

        if (matches.length === 0) {
            // No matching rows in local cache — do not treat as zero stock
            return { found: false, qty: 0 };
        }

        const qty = matches.reduce((sum, l) => {
            const n = Number(
                l.availableQty ?? l.quantity ?? l.qty ?? l.currentCount ?? l.balance ?? 0
            );
            return sum + (Number.isFinite(n) ? n : 0);
        }, 0);

        return { found: true, qty };
    };

    useEffect(() => {
        let isMounted = true;

        const fetchInitialData = async () => {
            try {
                const [godownRes, productRes, stockRes] = await Promise.all([
                    apiClient.get('/warehouse/godowns'),
                    apiClient.get('/inventory/products'),
                    apiClient.get('/inventory/ledger-data')
                ]);

                if (isMounted) {
                    setGodowns(godownRes.data?.data || godownRes.data || []);
                    setProducts(productRes.data?.data || productRes.data || []);
                    setStockLedger(stockRes.data?.data || stockRes.data || []);
                }
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                if (isMounted) {
                    showSoftAlert("Error loading transfer data. Please check your connection.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchInitialData();

        return () => {
            isMounted = false;
        };
    }, []);

    const getProductName = (variantId) => {
        const product = products.find(p =>
            p.id === variantId || p.productVariants?.some(v => v.id === variantId)
        );
        return product?.name || 'Unknown Item';
    };

    const filteredLedger = useMemo(() => {
        if (!ledgerSearch.trim()) return stockLedger;
        const lowerSearch = ledgerSearch.toLowerCase();
        return stockLedger.filter(item => {
            const pName = getProductName(item.productVariantId).toLowerCase();
            const gName = godowns.find(g => g.id === item.godownId)?.name?.toLowerCase() || '';
            return pName.includes(lowerSearch) || gName.includes(lowerSearch);
        });
    }, [stockLedger, ledgerSearch, products, godowns]);

    // --- SMART FIFO PICK ENGINE ---
    const handleRunFIFOPick = async () => {
        if (!smartPick.productVariantId || !smartPick.sourceGodownId || smartPick.qty <= 0) {
            showSoftAlert("Please fill in all Smart Pick fields correctly.");
            return;
        }

        // Same warehouse check
        if (destinationGodownId && String(destinationGodownId) === String(smartPick.sourceGodownId)) {
            showSoftAlert("Select correct warehouse — source and destination cannot be the same.");
            return;
        }

        // Empty / insufficient source stock check (only if local ledger has matching rows)
        const stockCheck = getAvailableQty(smartPick.productVariantId, smartPick.sourceGodownId);
        if (stockCheck.found && stockCheck.qty <= 0) {
            showSoftAlert("No stock available in the selected source warehouse for this product.");
            return;
        }
        if (stockCheck.found && smartPick.qty > stockCheck.qty) {
            showSoftAlert(`Only ${stockCheck.qty} units available in source warehouse. You requested ${smartPick.qty}.`);
            return;
        }
        // If found=false (IDs not matched in local cache), let the API decide

        try {
            const res = await apiClient.get('/inventory/transfer/suggest-plan', {
                params: {
                    productVariantId: smartPick.productVariantId,
                    variantId: smartPick.productVariantId,
                    requestedQty: smartPick.qty,
                    quantity: smartPick.qty,
                    sourceGodownId: smartPick.sourceGodownId,
                    godownId: smartPick.sourceGodownId
                }
            });

            const responseBody = res.data;
            const suggestedBatches = responseBody?.allocationPlan || responseBody?.data?.allocationPlan || responseBody?.data || [];

            if (!Array.isArray(suggestedBatches) || suggestedBatches.length === 0) {
                showSoftAlert("Not enough stock available in this godown to fulfill the request.");
                return;
            }

            const itemsWithDestinations = await Promise.all(suggestedBatches.map(async (batch) => {
                let suggestedBinId = 'DEFAULT-BIN';

                if (destinationGodownId) {
                    try {
                        const binRes = await apiClient.get('/warehouse/suggest-bin', {
                            params: {
                                variantId: smartPick.productVariantId,
                                productVariantId: smartPick.productVariantId,
                                productId: smartPick.productVariantId,
                                quantity: Number(batch.qtyToPick || batch.quantity || smartPick.qty),
                                godownId: destinationGodownId,
                                destinationGodownId: destinationGodownId,
                                warehouseId: destinationGodownId
                            }
                        });

                        const data = binRes.data?.data ?? binRes.data;
                        const best = Array.isArray(data) ? data[0] : data;
                        if (best) {
                            suggestedBinId = best.binId || best.id || best.binCode || 'DEFAULT-BIN';
                        }
                    } catch (err) {
                        console.warn("Bin suggestion failed, using DEFAULT-BIN", err?.response?.data || err.message);
                    }
                }

                return {
                    id: crypto.randomUUID(),
                    productVariantId: smartPick.productVariantId,
                    batchId: batch.batchId || batch.id,
                    batchNumber: batch.batchNumber,
                    sourceGodownId: smartPick.sourceGodownId,
                    sourceBinId: batch.sourceBinId || batch.binId || 'DEFAULT-BIN',
                    quantity: Number(batch.qtyToPick || batch.quantity || smartPick.qty),
                    destinationGodownId: destinationGodownId || '',
                    destinationBinId: suggestedBinId,
                    productName: getProductName(smartPick.productVariantId)
                };
            }));

            setTransferItems(prev => {
                const newItems = [...prev];
                itemsWithDestinations.forEach(newItem => {
                    const existingIndex = newItems.findIndex(i =>
                        i.batchId === newItem.batchId &&
                        i.sourceGodownId === newItem.sourceGodownId &&
                        i.productVariantId === newItem.productVariantId
                    );
                    if (existingIndex > -1) {
                        newItems[existingIndex].quantity += newItem.quantity;
                    } else {
                        newItems.push(newItem);
                    }
                });
                return newItems;
            });

            setIsSmartPickOpen(false);
            setSmartPick({ productVariantId: '', sourceGodownId: '', qty: 1 });

        } catch (error) {
            console.error("FIFO Suggestion Error:", error);
            showSoftAlert(error.response?.data?.message || error.message || "Failed to generate transfer plan.");
        }
    };

    const handleRemoveItem = (id) => {
        setTransferItems(prev => prev.filter(item => item.id !== id));
    };

    const handleDestinationChange = (itemId, newDestGodownId) => {
        const item = transferItems.find(i => i.id === itemId);
        if (item && newDestGodownId && String(newDestGodownId) === String(item.sourceGodownId)) {
            showSoftAlert("Select correct warehouse — source and destination cannot be the same.");
            return;
        }
        setTransferItems(prev => prev.map(i =>
            i.id === itemId
                ? {
                    ...i,
                    destinationGodownId: newDestGodownId,
                    destinationBinId: i.destinationBinId || 'DEFAULT-BIN'
                }
                : i
        ));
    };

    const submitTransfer = async () => {
        if (transferItems.length === 0) {
            showSoftAlert("Please add at least one item to transfer.");
            return;
        }

        for (const item of transferItems) {
            if (!item.destinationGodownId) {
                showSoftAlert(`Missing Destination Godown for ${item.productName}.`);
                return;
            }

            if (String(item.sourceGodownId) === String(item.destinationGodownId)) {
                showSoftAlert("Select correct warehouse — source and destination cannot be the same.");
                return;
            }

            const stockCheck = getAvailableQty(item.productVariantId, item.sourceGodownId);
            if (stockCheck.found && stockCheck.qty <= 0) {
                showSoftAlert(`No stock left in source for ${item.productName}.`);
                return;
            }
            if (stockCheck.found && item.quantity > stockCheck.qty) {
                showSoftAlert(
                    `Insufficient stock for ${item.productName}. Available: ${stockCheck.qty}, requested: ${item.quantity}.`
                );
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const payload = {
                transferDate: new Date().toISOString().split('T')[0],
                items: transferItems.map(item => ({
                    productVariantId: String(item.productVariantId),
                    batchId: String(item.batchId),
                    sourceGodownId: String(item.sourceGodownId),
                    sourceBinId: String(item.sourceBinId || 'DEFAULT-BIN'),
                    destinationGodownId: String(item.destinationGodownId),
                    destinationBinId: String(
                        item.destinationBinId && String(item.destinationBinId).trim()
                            ? item.destinationBinId
                            : 'DEFAULT-BIN'
                    ),
                    quantity: Number(item.quantity) || 0
                }))
            };

            const response = await apiClient.post('/inventory/transfer', payload);

            if (response.data.success) {
                showSoftAlert("Transfer successful!");
                setTransferItems([]);
                try {
                    const stockRes = await apiClient.get('/inventory/ledger-data');
                    setStockLedger(stockRes.data?.data || stockRes.data || []);
                } catch (_) { /* ignore */ }
                router.refresh();
            } else {
                showSoftAlert(response.data.message || "Transfer failed.");
            }
        } catch (error) {
            console.error("Transfer Submission Error:", error);
            showSoftAlert(error.response?.data?.message || "Failed to submit transfer.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading Transfer Data...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto relative">
            {/* SOFT ALERT BANNER */}
            {softAlert.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4">
                    <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-lg shadow-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium flex-1">{softAlert.message}</p>
                        <button
                            onClick={() => setSoftAlert({ show: false, message: '' })}
                            className="text-amber-600 hover:text-amber-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ArrowRightLeft className="w-6 h-6 text-[#017E84]" />
                        Stock Transfer
                    </h1>
                    <p className="text-sm text-slate-500">Move inventory between godowns and bins</p>
                </div>
                <button
                    onClick={submitTransfer}
                    disabled={isSubmitting || transferItems.length === 0}
                    className="bg-[#017E84] hover:bg-[#01656A] disabled:bg-slate-300 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                    <CheckCircle className="w-4 h-4" />
                    {isSubmitting ? 'Processing...' : 'Confirm Transfer'}
                </button>
            </div>

            {/* MAIN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT SIDE */}
                <div className="lg:col-span-2 space-y-6">

                    {/* DEFAULT DESTINATION */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Default Destination</h2>
                        <select
                            value={destinationGodownId}
                            onChange={(e) => {
                                const selectedGodown = e.target.value;
                                setDestinationGodownId(selectedGodown);
                                setTransferItems(prev => prev.map(item => {
                                    if (selectedGodown && String(selectedGodown) === String(item.sourceGodownId)) {
                                        return item;
                                    }
                                    return {
                                        ...item,
                                        destinationGodownId: item.destinationGodownId || selectedGodown,
                                        destinationBinId: item.destinationBinId || 'DEFAULT-BIN'
                                    };
                                }));
                            }}
                            className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] outline-none"
                        >
                            <option value="">-- Select Target Godown --</option>
                            {godowns.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* TRANSFER LIST */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Transfer List</h2>
                            <button
                                onClick={() => setIsSmartPickOpen(true)}
                                className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                            >
                                <Search className="w-3 h-3" />
                                Smart Pick (FIFO)
                            </button>
                        </div>

                        {transferItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                <Package className="w-10 h-10 mb-2 opacity-50" />
                                <p>No items added for transfer.</p>
                                <p className="text-xs mt-1">Use Smart Pick to allocate stock.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                                        <th className="pb-3 font-medium">Product</th>
                                        <th className="pb-3 font-medium">Source</th>
                                        <th className="pb-3 font-medium">Destination</th>
                                        <th className="pb-3 font-medium text-right">Qty</th>
                                        <th className="pb-3 font-medium text-center">Action</th>
                                    </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                    {transferItems.map((item) => (
                                        <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                            <td className="py-3 pr-4 font-medium text-slate-700">
                                                {item.productName}
                                                <div
                                                    className="text-xs text-slate-400 font-mono mt-0.5"
                                                    title={`Internal ID: ${item.batchId}`}
                                                >
                                                    {item.batchNumber
                                                        ? item.batchNumber
                                                        : `${String(item.batchId).substring(0, 12)}...`}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 text-xs">
                                                <span className="block text-slate-600 font-medium">
                                                    Godown: {godowns.find(g => g.id === item.sourceGodownId)?.name || 'N/A'}
                                                </span>
                                                <span className="block text-slate-400">Bin: {item.sourceBinId || 'N/A'}</span>
                                            </td>
                                            <td className="py-3 pr-4 space-y-1">
                                                <select
                                                    value={item.destinationGodownId}
                                                    onChange={(e) => handleDestinationChange(item.id, e.target.value)}
                                                    className={`w-full p-1.5 text-xs bg-white border rounded focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84] ${
                                                        item.destinationGodownId &&
                                                        String(item.destinationGodownId) === String(item.sourceGodownId)
                                                            ? 'border-amber-400 bg-amber-50'
                                                            : 'border-slate-300'
                                                    }`}
                                                >
                                                    <option value="">Select Godown</option>
                                                    {godowns.map(g => (
                                                        <option
                                                            key={g.id}
                                                            value={g.id}
                                                            disabled={String(g.id) === String(item.sourceGodownId)}
                                                        >
                                                            {g.name}
                                                            {String(g.id) === String(item.sourceGodownId)
                                                                ? ' (same – not allowed)'
                                                                : ''}
                                                        </option>
                                                    ))}
                                                </select>

                                                <input
                                                    type="text"
                                                    placeholder="Destination Bin/Rack..."
                                                    value={item.destinationBinId || ''}
                                                    onChange={(e) => setTransferItems(prev => prev.map(i =>
                                                        i.id === item.id
                                                            ? { ...i, destinationBinId: e.target.value || 'DEFAULT-BIN' }
                                                            : i
                                                    ))}
                                                    className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                                                />
                                            </td>
                                            <td className="py-3 pr-4 text-right">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => setTransferItems(prev => prev.map(i =>
                                                        i.id === item.id
                                                            ? { ...i, quantity: Number(e.target.value) }
                                                            : i
                                                    ))}
                                                    className="w-20 p-1.5 text-xs text-right bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84]"
                                                />
                                            </td>
                                            <td className="py-3 text-center">
                                                <button
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: STOCK OVERVIEW */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col max-h-[850px]">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Stock Overview</h2>

                    <div className="relative mb-4 shrink-0">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by product or godown..."
                            value={ledgerSearch}
                            onChange={(e) => setLedgerSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84]"
                        />
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {filteredLedger.slice(0, 20).map((ledgerItem, idx) => {
                            const pName = getProductName(ledgerItem.productVariantId);
                            return (
                                <div
                                    key={idx}
                                    className="bg-white p-3 rounded border border-slate-200 flex justify-between items-center text-sm shadow-sm"
                                >
                                    <div className="overflow-hidden pr-3">
                                        <p className="font-medium text-slate-700 truncate" title={pName}>{pName}</p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {godowns.find(g => g.id === ledgerItem.godownId)?.name}
                                        </p>
                                    </div>
                                    <div className="font-bold text-[#017E84] bg-[#017E84]/10 px-2.5 py-1 rounded shrink-0">
                                        {ledgerItem.availableQty}
                                    </div>
                                </div>
                            );
                        })}
                        {filteredLedger.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-8">
                                {ledgerSearch ? 'No stock matches your search.' : 'No active stock available.'}
                            </p>
                        )}
                        {filteredLedger.length > 20 && (
                            <p className="text-xs text-slate-400 text-center pt-2">
                                + {filteredLedger.length - 20} more items found. Keep typing to refine.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* SMART PICK MODAL */}
            {isSmartPickOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Search className="w-4 h-4 text-[#017E84]" /> Smart Pick (FIFO)
                            </h3>
                            <button
                                onClick={() => setIsSmartPickOpen(false)}
                                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label htmlFor="variant-select" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Product Variant
                                </label>
                                <select
                                    id="variant-select"
                                    value={smartPick.productVariantId}
                                    onChange={e => setSmartPick({ ...smartPick, productVariantId: e.target.value })}
                                    className="w-full p-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84]"
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.productVariants?.[0]?.id || p.id}>
                                            {p.name} {p.sku ? `(${p.sku})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="source-godown" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Source Godown
                                </label>
                                <select
                                    id="source-godown"
                                    value={smartPick.sourceGodownId}
                                    onChange={e => setSmartPick({ ...smartPick, sourceGodownId: e.target.value })}
                                    className="w-full p-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84]"
                                >
                                    <option value="">Select Origin...</option>
                                    {godowns.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="transfer-qty" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Quantity to Transfer
                                </label>
                                <input
                                    id="transfer-qty"
                                    type="number"
                                    min="1"
                                    value={smartPick.qty}
                                    onChange={e => setSmartPick({ ...smartPick, qty: Number(e.target.value) })}
                                    className="w-full p-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84]"
                                    placeholder="Enter Qty..."
                                />
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs p-3 rounded flex items-start gap-2 mt-4">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" />
                                <p>
                                    System will automatically select the oldest available batches
                                    (First-In, First-Out) to fulfill this quantity.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                            <button
                                onClick={() => setIsSmartPickOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRunFIFOPick}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#017E84] rounded-lg hover:bg-[#01656A] transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add to List
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}