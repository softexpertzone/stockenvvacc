// src/app/inventory/ledger/page.js
'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch } from '@/lib/apiFetcher';
import Pagination from '@/components/ui/Pagination';
import StockReclassificationModal from '@/features/inventory/components/StockReclassificationModal';
import Toast from '@/components/ui/Toast';

const extractData = (response) => {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
    return [];
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(d);
};

const MovementBadge = ({ type }) => {
    const styles = {
        RECEIPT: 'bg-green-50 text-green-700 border-green-200',
        DISPATCH: 'bg-red-50 text-red-700 border-red-200',
        TRANSFER: 'bg-blue-50 text-blue-700 border-blue-200',
        ADJUSTMENT: 'bg-orange-50 text-orange-700 border-orange-200',
        SORTING_RECLASSIFICATION: 'bg-purple-50 text-purple-700 border-purple-200',
        SALES_OUTBOUND: 'bg-red-50 text-red-700 border-red-200',
        INITIAL_PO_RECEIVE: 'bg-green-50 text-green-700 border-green-200',
    };
    const style = styles[type?.toUpperCase()] || 'bg-gray-50 text-gray-700 border-gray-200';
    return (
        <span className={`px-2 py-0.5 rounded-sm text-[11px] font-bold tracking-wide uppercase border ${style}`}>
            {type === 'SORTING_RECLASSIFICATION' ? 'SORTING' : type}
        </span>
    );
};

const CopyableSku = ({ sku }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e) => {
        e.stopPropagation();
        if (!sku) return;
        try {
            await navigator.clipboard.writeText(sku);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = sku;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    if (!sku) return <span className="text-gray-400">—</span>;

    return (
        <button
            type="button"
            onClick={handleCopy}
            title="Click to copy SKU"
            className="group inline-flex items-center gap-1 font-mono text-[11px] text-gray-500 hover:text-[#017E84] transition-colors cursor-pointer"
        >
            <span className="underline decoration-dotted underline-offset-2 group-hover:decoration-solid">
                {sku}
            </span>
            {copied ? (
                <span className="text-[10px] text-green-600 font-sans font-medium">Copied!</span>
            ) : (
                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </button>
    );
};

/**
 * Net company-wide stock impact of a ledger row.
 * TRANSFER does NOT change total stock across all warehouses.
 * Only inbound (PO/receipt) increases; outbound (sale/dispatch) decreases.
 */
function netImpactAllWarehouses(move) {
    const type = String(move.type || '').toUpperCase();
    const qty = Math.abs(Number(move.quantity) || 0);
    if (!qty) return 0;

    // Transfers only move between godowns — company total unchanged
    if (type.includes('TRANSFER')) return 0;

    // Outbound
    if (
        type.includes('DISPATCH') ||
        type.includes('SALES') ||
        type.includes('OUTBOUND') ||
        type.includes('REMOVE')
    ) {
        return -qty;
    }

    // Inbound / receive / positive adjustment
    if (
        type.includes('RECEIVE') ||
        type.includes('RECEIPT') ||
        type.includes('GRN') ||
        type.includes('PO_') ||
        type.includes('PUTAWAY') ||
        type.includes('ADJUSTMENT')
    ) {
        // Prefer sign if API provides it
        const raw = Number(move.quantity);
        if (Number.isFinite(raw) && raw < 0) return raw;
        return qty;
    }

    // Fallback: trust signed quantity, but still ignore pure transfers (handled above)
    const raw = Number(move.quantity);
    return Number.isFinite(raw) ? raw : 0;
}

/**
 * Impact on a specific godown (by name match on from/to location strings).
 */
function netImpactForGodown(move, godownName) {
    if (!godownName) return netImpactAllWarehouses(move);

    const type = String(move.type || '').toUpperCase();
    const qty = Math.abs(Number(move.quantity) || 0);
    if (!qty) return 0;

    const name = godownName.toLowerCase();
    const from = String(move.fromLocation || '').toLowerCase();
    const to = String(move.toLocation || '').toLowerCase();

    if (type.includes('TRANSFER')) {
        const left = from.includes(name);
        const entered = to.includes(name);
        if (left && !entered) return -qty; // left this warehouse
        if (entered && !left) return qty; // entered this warehouse
        return 0;
    }

    // Non-transfer: if location mentions this godown, apply typed impact
    const touches =
        from.includes(name) || to.includes(name) || (!from && !to);

    if (!touches) return 0;
    return netImpactAllWarehouses(move);
}

export default function StockLedgerPage() {
    const [movements, setMovements] = useState([]);
    const [balances, setBalances] = useState([]);
    const [totalStock, setTotalStock] = useState(0);
    const [godowns, setGodowns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [balancesOk, setBalancesOk] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('ALL');
    const [selectedGodown, setSelectedGodown] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isGodownDropdownOpen, setIsGodownDropdownOpen] = useState(false);
    const typeDropdownRef = useRef(null);
    const godownDropdownRef = useRef(null);

    const [isReclassModalOpen, setIsReclassModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    const movementTypes = [
        'RECEIPT',
        'DISPATCH',
        'TRANSFER',
        'ADJUSTMENT',
        'SORTING_RECLASSIFICATION',
        'SALES_OUTBOUND',
        'INITIAL_PO_RECEIVE'
    ];

    useEffect(() => {
        (async () => {
            try {
                let data = [];
                try {
                    const res = await apiFetch('/warehouse/godowns');
                    data = extractData(res);
                } catch {
                    const res = await apiFetch('/inventory/godowns');
                    data = extractData(res);
                }
                setGodowns(data);
            } catch {
                setGodowns([]);
            }
        })();
    }, []);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);

                const ledgerUrl = selectedGodown
                    ? `/inventory/ledger-data?godownId=${selectedGodown}`
                    : '/inventory/ledger-data';

                const ledgerRes = await apiFetch(ledgerUrl);
                if (!isMounted) return;
                setMovements(extractData(ledgerRes));

                // Prefer real inventoryBalance totals
                try {
                    const balanceUrl = selectedGodown
                        ? `/inventory/stock-balances?godownId=${selectedGodown}`
                        : '/inventory/stock-balances';
                    const balRes = await apiFetch(balanceUrl);
                    if (!isMounted) return;

                    const rows = extractData(balRes);
                    setBalances(rows);
                    setBalancesOk(true);

                    const apiTotal =
                        balRes?.totalQuantity ??
                        balRes?.data?.totalQuantity ??
                        null;

                    if (apiTotal != null) {
                        setTotalStock(Number(apiTotal) || 0);
                    } else {
                        setTotalStock(
                            rows.reduce((s, r) => {
                                const q = Number(
                                    r.availableQty ?? r.currentCount ?? r.quantity ?? 0
                                );
                                return s + (Number.isFinite(q) ? q : 0);
                            }, 0)
                        );
                    }
                } catch {
                    // No balances route yet — derive Total Stock from ledger correctly
                    // (transfers ignored for all-warehouse; signed/inbound-outbound only)
                    if (!isMounted) return;
                    setBalances([]);
                    setBalancesOk(false);

                    const godownName = selectedGodown
                        ? godowns.find((g) => g.id === selectedGodown)?.name || ''
                        : '';

                    const allMoves = extractData(ledgerRes);
                    const derived = allMoves.reduce((s, m) => {
                        return (
                            s +
                            (godownName
                                ? netImpactForGodown(m, godownName)
                                : netImpactAllWarehouses(m))
                        );
                    }, 0);

                    // Prefer API totalQuantity only if it looks sane; else use derived
                    const apiQty = Number(
                        ledgerRes?.totalQuantity ?? ledgerRes?.data?.totalQuantity
                    );
                    setTotalStock(
                        Number.isFinite(apiQty) && apiQty >= 0 && !selectedGodown
                            ? apiQty
                            : Math.max(0, derived)
                    );
                }
            } catch {
                if (isMounted) setError('Failed to load ledger history.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();
        return () => {
            isMounted = false;
        };
    }, [selectedGodown, refreshKey, godowns]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setIsTypeDropdownOpen(false);
            }
            if (godownDropdownRef.current && !godownDropdownRef.current.contains(event.target)) {
                setIsGodownDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredMovements = useMemo(() => {
        return movements.filter((move) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                (move.sku || '').toLowerCase().includes(q) ||
                (move.productName || '').toLowerCase().includes(q) ||
                (move.reference || '').toLowerCase().includes(q);

            const matchesType =
                selectedType === 'ALL' ||
                (move.type || '').toUpperCase() === selectedType;

            return matchesSearch && matchesType;
        });
    }, [movements, searchQuery, selectedType]);

    const paginatedMovements = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMovements.slice(start, start + itemsPerPage);
    }, [filteredMovements, currentPage]);

    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage) || 1;

    /**
     * Search Result Stock = FINAL on-hand for products matching search.
     *
     * Example:
     *   PO receive +19, transfer +9, transfer +3  →  shows 19 (not 31)
     * Transfers never inflate company-wide stock.
     */
    const searchedBalance = useMemo(() => {
        if (!searchQuery.trim()) return 0;
        const q = searchQuery.toLowerCase();
        const godownName = selectedGodown
            ? godowns.find((g) => g.id === selectedGodown)?.name || ''
            : '';

        // 1) Best: live balances from inventoryBalance
        if (balancesOk && balances.length > 0) {
            const matched = balances.filter(
                (b) =>
                    (b.sku || '').toLowerCase().includes(q) ||
                    (b.productName || b.name || '').toLowerCase().includes(q)
            );
            return matched.reduce((s, b) => {
                const qty = Number(
                    b.availableQty ?? b.currentCount ?? b.quantity ?? b.qty ?? 0
                );
                return s + (Number.isFinite(qty) ? qty : 0);
            }, 0);
        }

        // 2) Fallback from ledger: net impact only (IGNORE transfer for all-WH total)
        //    Group by product key so multi-product search still works
        const byProduct = new Map();

        for (const move of filteredMovements) {
            const key =
                move.productVariantId ||
                move.sku ||
                move.productName ||
                'unknown';

            const delta = godownName
                ? netImpactForGodown(move, godownName)
                : netImpactAllWarehouses(move);

            byProduct.set(key, (byProduct.get(key) || 0) + delta);
        }

        let total = 0;
        for (const v of byProduct.values()) {
            total += v;
        }
        return Math.max(0, total);
    }, [
        searchQuery,
        balancesOk,
        balances,
        filteredMovements,
        selectedGodown,
        godowns
    ]);

    const handleReset = () => {
        setSearchQuery('');
        setSelectedType('ALL');
        setSelectedGodown('');
        setCurrentPage(1);
        setIsTypeDropdownOpen(false);
        setIsGodownDropdownOpen(false);
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 bg-[#f9fafb] min-h-screen text-[#374151]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#374151] tracking-tight">
                        STOCK LEDGER
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider text-[11px] font-semibold">
                        Immutable history of all inventory movements
                    </p>
                    <button
                        onClick={() => setIsReclassModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-[#017E84] text-white text-sm font-bold rounded-sm shadow hover:bg-[#01656A] transition"
                    >
                        + Re-evaluate Stock
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    {searchQuery && (
                        <div className="bg-white border border-gray-200 rounded-sm shadow-sm relative pt-1 w-full sm:w-48 overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
                            <div className="p-4 text-right">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                    Search Result Stock
                                </p>
                                <p className="text-2xl font-bold text-[#374151]">
                                    {searchedBalance.toLocaleString()}
                                    <span className="text-xs font-medium ml-1 text-gray-400">
                                        UNITS
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm relative pt-1 w-full sm:w-48 overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84]" />
                        <div className="p-4 text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 line-clamp-1">
                                {selectedGodown ? 'Warehouse Stock' : 'Total Stock'}
                            </p>
                            <p className="text-2xl font-bold text-[#374151]">
                                {totalStock.toLocaleString()}
                                <span className="text-xs font-medium ml-1 text-gray-400">
                                    UNITS
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 text-red-700 bg-red-50 rounded-sm border border-red-200 text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="mb-6 bg-white rounded-sm border border-gray-200 shadow-sm relative z-20">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm" />
                <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <input
                        type="text"
                        placeholder="Search SKU, Product, or Ref..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-sm text-sm outline-none focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                    />

                    <div className="relative w-full md:w-56" ref={godownDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsGodownDropdownOpen(!isGodownDropdownOpen)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm text-left flex justify-between items-center focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                        >
                            <span className="truncate">
                                {selectedGodown
                                    ? godowns.find((g) => g.id === selectedGodown)?.name ||
                                    'Unknown Warehouse'
                                    : 'All Warehouses'}
                            </span>
                            <svg
                                className={`w-4 h-4 text-gray-500 transition-transform ${
                                    isGodownDropdownOpen ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {isGodownDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg">
                                <ul className="max-h-60 overflow-y-auto py-1 text-sm">
                                    <li
                                        onClick={() => {
                                            setSelectedGodown('');
                                            setCurrentPage(1);
                                            setIsGodownDropdownOpen(false);
                                        }}
                                        className="px-4 py-2 cursor-pointer hover:bg-gray-50"
                                    >
                                        All Warehouses
                                    </li>
                                    {godowns.map((g) => (
                                        <li
                                            key={g.id}
                                            onClick={() => {
                                                setSelectedGodown(g.id);
                                                setCurrentPage(1);
                                                setIsGodownDropdownOpen(false);
                                            }}
                                            className="px-4 py-2 cursor-pointer hover:bg-gray-50"
                                        >
                                            {g.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="relative w-full md:w-48" ref={typeDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm text-left flex justify-between items-center focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                        >
                            <span className="truncate">
                                {selectedType === 'ALL' ? 'All Movements' : selectedType}
                            </span>
                            <svg
                                className={`w-4 h-4 text-gray-500 transition-transform ${
                                    isTypeDropdownOpen ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {isTypeDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg">
                                <ul className="max-h-60 overflow-y-auto py-1 text-sm">
                                    <li
                                        onClick={() => {
                                            setSelectedType('ALL');
                                            setCurrentPage(1);
                                            setIsTypeDropdownOpen(false);
                                        }}
                                        className="px-4 py-2 cursor-pointer hover:bg-gray-50"
                                    >
                                        All Movements
                                    </li>
                                    {movementTypes.map((type) => (
                                        <li
                                            key={type}
                                            onClick={() => {
                                                setSelectedType(type);
                                                setCurrentPage(1);
                                                setIsTypeDropdownOpen(false);
                                            }}
                                            className="px-4 py-2 cursor-pointer hover:bg-gray-50"
                                        >
                                            {type}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleReset}
                        className="w-full md:w-auto px-4 py-2 bg-gray-100 text-[#374151] font-medium rounded-sm text-sm hover:bg-gray-200 transition whitespace-nowrap"
                    >
                        CLEAR FILTERS
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-sm border border-gray-200 shadow-sm relative overflow-hidden z-10">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] z-10" />

                {loading ? (
                    <div className="p-12 text-center text-sm font-medium text-gray-500 uppercase tracking-widest">
                        Loading ledger history...
                    </div>
                ) : (
                    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKU & Product</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">From</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">To</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Qty</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {paginatedMovements.length > 0 ? (
                                    paginatedMovements.map((move, idx) => (
                                        <tr key={move.id || idx} className="hover:bg-[#f9fafb] transition-colors">
                                            <td className="p-3 text-gray-600">{formatDate(move.createdAt)}</td>
                                            <td className="p-3 text-[#017E84] font-medium">{move.reference}</td>
                                            <td className="p-3"><MovementBadge type={move.type} /></td>
                                            <td className="p-3 max-w-[250px]">
                                                <div className="mb-0.5"><CopyableSku sku={move.sku} /></div>
                                                <div className="font-medium text-[#374151] truncate" title={move.productName}>
                                                    {move.productName}
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-600">{move.fromLocation || '-'}</td>
                                            <td className="p-3 text-gray-600">{move.toLocation || '-'}</td>
                                            <td className={`p-3 text-right font-bold ${Number(move.quantity) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {Number(move.quantity) > 0 ? '+' : ''}{move.quantity}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-gray-500 text-sm">
                                            No movements found.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                            totalItems={filteredMovements.length}
                            itemsPerPage={itemsPerPage}
                        />
                    </div>
                )}
            </div>

            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            <StockReclassificationModal
                isOpen={isReclassModalOpen}
                onClose={() => setIsReclassModalOpen(false)}
                onSuccess={() => {
                    setRefreshKey((prev) => prev + 1);
                    setToast({ message: 'Stock reclassified successfully', type: 'success' });
                }}
            />
        </div>
    );
}
