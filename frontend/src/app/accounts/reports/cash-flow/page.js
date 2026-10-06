'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Pure function decoupled from React state to handle the API call
const fetchCashFlowData = async (from, to) => {
    const targetUrl = `${API_BASE_URL}/api/accounts/reports/cash-flow?fromDate=${from}&toDate=${to}`;

    // Get token the same way other pages do
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('token') || localStorage.getItem('accessToken') || ''
        : '';

    const res = await fetch(targetUrl, {
        headers: {
            'Accept': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        },
    });

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
            `Server returned non-JSON response (${res.status} ${res.statusText}). Make sure your Express backend is running on port 5000.`
        );
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
};

export default function CashFlowReportPage() {
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [report, setReport] = useState(null);
    const [error, setError] = useState('');
    // 1. Initialize loading as true so we don't need to synchronously set it on mount
    const [loading, setLoading] = useState(true);

    // Initial Mount Effect - 100% Asynchronous
    useEffect(() => {
        let isMounted = true;

        const initializeData = async () => {
            try {
                // By doing the await FIRST, we guarantee no synchronous state
                // updates happen during the effect's initial tick.
                const data = await fetchCashFlowData(fromDate, toDate);

                if (!isMounted) return;

                if (data.success) {
                    setReport(data.data);
                } else {
                    setError(data.message || 'Failed to fetch Cash Flow Statement.');
                }
            } catch (err) {
                if (isMounted) setError(err.message || 'Network error connecting to backend service.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (fromDate && toDate) {
            initializeData();
        }

        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Manual Form Submission - Safe to use synchronous state here
    const handleFilter = async (e) => {
        e.preventDefault();
        if (!fromDate || !toDate) return;

        setError('');
        setLoading(true);

        try {
            const data = await fetchCashFlowData(fromDate, toDate);
            if (data.success) {
                setReport(data.data);
            } else {
                setError(data.message || 'Failed to fetch Cash Flow Statement.');
            }
        } catch (err) {
            setError(err.message || 'Network error connecting to backend service.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        const num = Number(val || 0);
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">

            {/* Odoo ERP Header / Control Panel */}
            <header className="bg-[#714B67] text-white border-b border-[#5c3c54] sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Breadcrumbs & Title */}
                    <div>
                        <div className="flex items-center gap-2 text-xs text-purple-200 font-medium">
                            <span>Accounting</span>
                            <span>/</span>
                            <span>Reporting</span>
                            <span>/</span>
                            <span className="text-white font-bold">Cash Flow Statement</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight mt-0.5">Cash Flow Statement</h1>
                    </div>

                    {/* Action Bar / Controls */}
                    <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2 bg-[#5c3c54] p-1.5 rounded-md border border-purple-900/30">
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-[11px] font-semibold text-purple-200 uppercase">From:</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-white text-slate-900 text-xs px-2.5 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono"
                            />
                        </div>

                        <div className="flex items-center gap-2 px-2 border-l border-purple-800">
                            <span className="text-[11px] font-semibold text-purple-200 uppercase">To:</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-white text-slate-900 text-xs px-2.5 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#008784] hover:bg-[#007370] text-white text-xs font-semibold px-4 py-1.5 rounded transition-all shadow-sm border border-teal-700 disabled:opacity-50"
                        >
                            {loading ? 'Fetching...' : 'Apply Filter'}
                        </button>
                    </form>

                </div>
            </header>

            {/* Main Content Area - Odoo Paper Document Sheet */}
            <main className="max-w-5xl mx-auto mt-6 px-4">

                {/* Secondary Action Toolbar */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5"
                        >
                            <span>🖨️</span> Print Report
                        </button>
                    </div>
                    <div className="text-xs text-slate-500 italic">
                        Method: <strong className="text-slate-700 font-medium">Direct Method (Cash & Bank)</strong>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4 rounded shadow-sm">
                        <div className="flex items-start">
                            <span className="text-red-600 text-base mr-2">⚠️</span>
                            <div>
                                <h3 className="text-xs font-bold text-red-800 uppercase">Connection / Response Error</h3>
                                <p className="text-xs text-red-700 mt-1 font-mono">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Odoo Financial Paper Sheet Container */}
                <div className="bg-white border border-slate-300 rounded shadow-md p-8 md:p-12 min-h-[600px]">

                    {/* Sheet Letterhead Header */}
                    <div className="border-b border-slate-200 pb-6 mb-8 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">CASH FLOW STATEMENT</h2>
                            <p className="text-xs text-slate-500 mt-1">Period: {fromDate} to {toDate}</p>
                        </div>
                        <div className="text-right">
                            <span className="inline-block bg-teal-50 text-[#008784] border border-teal-200 text-[11px] font-bold px-2.5 py-0.5 rounded">
                                ODOO ERP REPORT
                            </span>
                        </div>
                    </div>

                    {/* KPI Summary Cards Bar */}
                    {report && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded border border-slate-200">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Opening Cash</span>
                                <span className="text-base font-bold text-slate-800 font-mono">${formatCurrency(report.openingCash)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operating Net</span>
                                <span className={`text-base font-bold font-mono ${report.netOperating >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                    ${formatCurrency(report.netOperating)}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Change</span>
                                <span className={`text-base font-bold font-mono ${report.netCashFlow >= 0 ? 'text-teal-700' : 'text-amber-600'}`}>
                                    ${formatCurrency(report.netCashFlow)}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Closing Cash</span>
                                <span className="text-base font-bold text-slate-900 font-mono">${formatCurrency(report.closingCash)}</span>
                            </div>
                        </div>
                    )}

                    {/* Financial Statement Tables */}
                    {report ? (
                        <div className="space-y-8">
                            <OdooActivityTable title="1. Cash Flow from Operating Activities" items={report.operating} netTotal={report.netOperating} formatCurrency={formatCurrency} />
                            <OdooActivityTable title="2. Cash Flow from Investing Activities" items={report.investing} netTotal={report.netInvesting} formatCurrency={formatCurrency} />
                            <OdooActivityTable title="3. Cash Flow from Financing Activities" items={report.financing} netTotal={report.netFinancing} formatCurrency={formatCurrency} />

                            {/* Statement Reconciliation Footer */}
                            <div className="mt-8 pt-6 border-t-2 border-slate-900 space-y-2">
                                <div className="flex justify-between text-xs font-semibold text-slate-700">
                                    <span>Net Increase / (Decrease) in Cash & Cash Equivalents</span>
                                    <span className="font-mono">${formatCurrency(report.netCashFlow)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-700">
                                    <span>Cash & Cash Equivalents at Beginning of Period</span>
                                    <span className="font-mono">${formatCurrency(report.openingCash)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
                                    <span>Cash & Cash Equivalents at End of Period</span>
                                    <span className="font-mono text-teal-800">${formatCurrency(report.closingCash)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        !loading && (
                            <div className="text-center py-20 text-slate-400 text-xs">
                                No statement data loaded. Select a date range and click <strong>Apply Filter</strong>.
                            </div>
                        )
                    )}

                </div>
            </main>
        </div>
    );
}

function OdooActivityTable({ title, items = [], netTotal, formatCurrency }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-baseline border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
                <span className="text-xs font-bold font-mono text-slate-900">
                    Net: ${formatCurrency(netTotal)}
                </span>
            </div>

            {items.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2 pl-4">No transactions logged under this classification.</p>
            ) : (
                <table className="w-full text-left text-xs">
                    <thead>
                    <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-200 font-semibold">
                        <th className="py-1.5 pl-2">Date</th>
                        <th className="py-1.5">Voucher</th>
                        <th className="py-1.5">Particulars</th>
                        <th className="py-1.5 text-right">Inflow</th>
                        <th className="py-1.5 text-right">Outflow</th>
                        <th className="py-1.5 text-right pr-2">Net</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                    {items.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-1.5 pl-2 text-slate-600 font-mono text-[11px]">{new Date(row.date).toLocaleDateString()}</td>
                            <td className="py-1.5 text-slate-500 font-mono text-[11px]">{row.voucherNumber}</td>
                            <td className="py-1.5 text-slate-800 font-medium">{row.particular}</td>
                            <td className="py-1.5 text-right font-mono text-emerald-700">
                                {row.inflow > 0 ? `$${formatCurrency(row.inflow)}` : '-'}
                            </td>
                            <td className="py-1.5 text-right font-mono text-red-600">
                                {row.outflow > 0 ? `$${formatCurrency(row.outflow)}` : '-'}
                            </td>
                            <td className={`py-1.5 text-right font-mono font-semibold pr-2 ${row.net >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                ${formatCurrency(row.net)}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}