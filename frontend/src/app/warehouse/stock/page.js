'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetcher';

export default function WarehouseStockPage() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Initial load effect - purely async with no synchronous state setters
    useEffect(() => {
        let active = true;

        const loadInitialInventory = async () => {
            try {
                const res = await apiFetch('/api/warehouse/stock-levels');
                const stockData = res?.data?.data ?? res?.data ?? (Array.isArray(res) ? res : []);

                if (active) {
                    if (Array.isArray(stockData)) {
                        setInventory(stockData);
                    } else {
                        console.error('Unexpected stock response structure:', res);
                        setInventory([]);
                    }
                }
            } catch (err) {
                if (active) {
                    console.error("Failed to load warehouse stock:", err);
                    setError("Could not load warehouse stock levels.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadInitialInventory();

        return () => {
            active = false;
        };
    }, []);

    // Manual refresh handler for user interactions (Reset / Form submit)
    const refreshInventory = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await apiFetch('/api/warehouse/stock-levels');
            const stockData = res?.data?.data ?? res?.data ?? (Array.isArray(res) ? res : []);

            if (Array.isArray(stockData)) {
                setInventory(stockData);
            } else {
                console.error('Unexpected stock response structure:', res);
                setInventory([]);
            }
        } catch (err) {
            console.error("Failed to load warehouse stock:", err);
            setError("Could not load warehouse stock levels.");
        } finally {
            setLoading(false);
        }
    };

    // Handle PO / GRN / Batch Search filter
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            return refreshInventory();
        }

        setIsSearching(true);
        setError(null);

        try {
            const res = await apiFetch(`/api/warehouse/po-search/${searchQuery.trim()}`);
            const stockData = res?.data?.data ?? res?.data ?? (Array.isArray(res) ? res : []);

            if (Array.isArray(stockData)) {
                setInventory(stockData);
                if (stockData.length === 0) {
                    setError(`No inventory records found for "${searchQuery}".`);
                }
            } else {
                setInventory([]);
                setError(`No records found for "${searchQuery}".`);
            }
        } catch (err) {
            console.error("Search failed:", err);
            setInventory([]);
            setError("No inventory records found matching your query or search failed.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleReset = () => {
        setSearchQuery('');
        refreshInventory();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center w-full">
                <div className="flex items-center gap-3 text-[#017E84] font-medium text-sm">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scanning Warehouse Racks...
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto bg-[#f9fafb] min-h-screen text-[#374151] font-sans">
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">
                    Live Warehouse Inventory
                </h1>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                    Real-time tracking of physical product placement, batch numbers, and bin paths.
                </p>
            </div>

            {/* --- SEARCH FILTER BAR --- */}
            <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    placeholder="Search by PO Number, GRN, or Batch Number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border border-gray-300 bg-white px-4 py-2 rounded-sm w-full md:w-96 focus:outline-none focus:ring-1 focus:ring-[#017E84] text-sm text-gray-800 shadow-sm"
                />
                <button
                    type="submit"
                    className="bg-[#017E84] text-white px-5 py-2 rounded-sm hover:bg-[#01666b] font-medium text-sm transition shadow-sm disabled:bg-gray-400"
                    disabled={isSearching}
                >
                    {isSearching ? 'Searching...' : 'Search PO/GRN'}
                </button>
                <button
                    type="button"
                    onClick={handleReset}
                    className="bg-white text-gray-700 px-4 py-2 rounded-sm hover:bg-gray-50 font-medium text-sm transition border border-gray-300 shadow-sm"
                >
                    Reset
                </button>
            </form>

            {/* Error Message Display */}
            {error && (
                <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-sm border border-amber-200 max-w-full text-sm font-medium shadow-sm">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-bold text-gray-500 tracking-wider">
                            <th className="p-4">Product Name</th>
                            <th className="p-4">SKU</th>
                            <th className="p-4 text-right">Qty</th>
                            <th className="p-4">Batch</th>
                            <th className="p-4">Bin / Location Path</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                        {inventory.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-400 italic">
                                    No stock tracked in system storage yet.
                                </td>
                            </tr>
                        ) : (
                            inventory.map((item, idx) => {
                                // 1. Resolve Product Name
                                const productName =
                                    item.productName ||
                                    item.productVariant?.product?.name ||
                                    item.variant?.product?.name ||
                                    item.product?.name ||
                                    item.variant?.name ||
                                    item.batch?.productVariant?.product?.name ||
                                    'Unnamed Product';

                                // 2. Resolve SKU
                                const sku =
                                    item.sku ||
                                    item.productVariant?.sku ||
                                    item.variant?.sku ||
                                    item.product?.sku ||
                                    item.batch?.productVariant?.sku ||
                                    '—';

                                // 3. Resolve Quantity across all ERP schema variations
                                const rawQuantity =
                                    item.currentBinQuantity ??
                                    item.quantityCount ??
                                    item.quantity ??
                                    item.currentQuantity ??
                                    item.currentStock ??
                                    item.stockQuantity ??
                                    item.availableQuantity ??
                                    item.initialQuantity ??
                                    item.qty ??
                                    item.balance ??
                                    item.onHand ??
                                    item.batch?.quantityCount ??
                                    item.batch?.quantity ??
                                    item.batch?.currentQuantity ??
                                    item.batch?.initialQuantity ??
                                    0;

                                const quantity = typeof rawQuantity === 'number' ? rawQuantity : parseInt(rawQuantity, 10) || 0;

                                // 4. Resolve Batch Number
                                const batchNumber =
                                    item.batchNumber ||
                                    item.batch?.batchNumber ||
                                    item.batchCode ||
                                    item.batch?.code ||
                                    item.code ||
                                    '—';

                                // 5. Resolve Hierarchy Locations
                                const rawBinPath =
                                    item.locationPath ||
                                    item.binPath ||
                                    item.bin?.path ||
                                    item.binLocation?.path ||
                                    item.path;

                                const godownName =
                                    item.bin?.rack?.room?.godown?.name ||
                                    item.rack?.room?.godown?.name ||
                                    item.godown?.name ||
                                    item.godownName ||
                                    item.warehouse?.name ||
                                    item.warehouseName ||
                                    item.batch?.godown?.name;

                                const roomName =
                                    item.bin?.rack?.room?.name ||
                                    item.rack?.room?.name ||
                                    item.room?.name ||
                                    item.roomName;

                                const rackName =
                                    item.bin?.rack?.name ||
                                    item.rack?.name ||
                                    item.rackName;

                                const binName =
                                    item.binName ||
                                    item.bin?.name ||
                                    item.bin?.code ||
                                    item.binLocation?.name;

                                return (
                                    <tr key={item.id || item.ledgerId || idx} className="hover:bg-teal-50/20 transition-colors">
                                        {/* Product Name */}
                                        <td className="p-4 font-semibold text-gray-900">
                                            {productName}
                                        </td>

                                        {/* SKU */}
                                        <td className="p-4 font-mono text-xs text-gray-600">
                                            {sku}
                                        </td>

                                        {/* Quantity */}
                                        <td className="p-4 text-right">
                                                <span className="font-bold text-gray-900 text-base">
                                                    {quantity}
                                                </span>
                                            <span className="text-gray-400 text-xs ml-1">pcs</span>
                                        </td>

                                        {/* Batch */}
                                        <td className="p-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-xs font-semibold">
                                                    {batchNumber}
                                                </span>
                                        </td>

                                        {/* Location Path */}
                                        <td className="p-4">
                                            {rawBinPath ? (
                                                <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded font-mono text-xs border border-emerald-200 font-medium">
                                                        📍 {rawBinPath}
                                                    </span>
                                            ) : godownName || rackName ? (
                                                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                                    {godownName && (
                                                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                                                                🏢 {godownName}
                                                            </span>
                                                    )}
                                                    {roomName && (
                                                        <>
                                                            <span className="text-gray-300">➔</span>
                                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-100">
                                                                    🚪 {roomName}
                                                                </span>
                                                        </>
                                                    )}
                                                    {rackName && (
                                                        <>
                                                            <span className="text-gray-300">➔</span>
                                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-100">
                                                                    📍 {rackName}
                                                                </span>
                                                        </>
                                                    )}
                                                    {binName && (
                                                        <>
                                                            <span className="text-gray-300">➔</span>
                                                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-medium border border-emerald-200">
                                                                    📦 Bin: {binName}
                                                                </span>
                                                        </>
                                                    )}
                                                    {!binName && !rackName && (
                                                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                                                                (Unassigned Bin)
                                                            </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-red-600 font-medium bg-red-50 px-2.5 py-1 rounded border border-red-100 inline-block">
                                                        ⚠️ Floating Stock (No Location Assigned)
                                                    </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}