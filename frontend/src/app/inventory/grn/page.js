'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetcher';
import Toast from '@/components/ui/Toast';

function GRNListContent() {
    const [pendingPOs, setPendingPOs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    const searchParams = useSearchParams();

    // Soft success toast when redirected after processing a GRN
    useEffect(() => {
        const success = searchParams.get('success');

        if (success === 'true') {
            const timer = setTimeout(() => {
                setToast({
                    message: 'Goods Receipt processed successfully',
                    type: 'success'
                });
            }, 0);

            // Clean the URL
            const url = new URL(window.location.href);
            url.searchParams.delete('success');
            window.history.replaceState({}, '', url.pathname);

            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchPendingOrders = async () => {
            try {
                setIsLoading(true);
                const res = await apiFetch('/api/purchase/orders?status=PENDING');

                console.log("Raw API Response:", res);

                if (res?.error || res?.status === 401) {
                    console.warn("API Error or Auth blocked the request. Defaulting to empty list.");
                    setPendingPOs([]);
                    setToast({ message: 'Unable to load pending orders', type: 'error' });
                    return;
                }

                let list = [];
                if (Array.isArray(res)) {
                    list = res;
                } else if (res?.data && Array.isArray(res.data)) {
                    list = res.data;
                } else if (res?.data?.data && Array.isArray(res.data.data)) {
                    list = res.data.data;
                } else if (res?.data?.orders && Array.isArray(res.data.orders)) {
                    list = res.data.orders;
                } else {
                    console.error("Could not locate data array in response:", res);
                }

                setPendingPOs(list);
            } catch (err) {
                console.error("Failed to fetch POs:", err);
                setPendingPOs([]);
                setToast({ message: 'Failed to load pending orders', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPendingOrders();
    }, []);

    return (
        <div className="min-h-screen bg-[#f9fafb] text-[#374151] font-sans relative w-full overflow-x-hidden pb-12">

            {/* Soft Toast */}
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            {/* Header Bar */}
            <div className="bg-white border-b border-gray-300 px-4 md:px-6 py-3 flex items-center justify-between w-full relative z-20">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg md:text-xl font-semibold text-gray-800 tracking-tight">
                        Pending Goods Receipts
                    </h1>
                    <span className="hidden sm:inline-block px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 text-[10px] sm:text-xs font-bold uppercase rounded-sm">
                        Action Required
                    </span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-4 md:py-6 px-2 sm:px-4 lg:px-8 w-full">
                <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full">
                    {/* Teal Accent Bar */}
                    <div className="h-1 bg-[#017E84] w-full"></div>

                    {/* 📱 MOBILE VIEW */}
                    <div className="block md:hidden divide-y divide-gray-200">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-400 text-sm font-medium">
                                Loading pending orders...
                            </div>
                        ) : Array.isArray(pendingPOs) && pendingPOs.length > 0 ? (
                            pendingPOs.map((po) => (
                                <div key={po.id} className="p-4 bg-white space-y-3 relative hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <span className="font-mono text-sm font-bold text-[#017E84]">
                                            {po.purchaseNumber || po.orderNumber || 'N/A'}
                                        </span>
                                        <span className="text-xs text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded">
                                            {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-0.5">Supplier</label>
                                        <div className="text-sm font-bold text-gray-800">
                                            {po.partner?.name || po.supplier?.name || 'Unknown Supplier'}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Link
                                            href={`/inventory/grn/${po.id}`}
                                            className="w-full flex items-center justify-center px-4 py-2 bg-[#017E84] hover:bg-[#01696e] text-white rounded-sm text-sm font-bold uppercase tracking-wide transition-colors shadow-sm"
                                        >
                                            Process Receipt
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No pending purchase orders available.
                            </div>
                        )}
                    </div>

                    {/* 🖥️ DESKTOP VIEW */}
                    <div className="hidden md:block w-full overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                            <tr className="border-b-2 border-gray-300 bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                <th className="p-3 font-bold pl-6 w-[25%]">PO Number</th>
                                <th className="p-3 font-bold w-[40%]">Supplier</th>
                                <th className="p-3 font-bold text-right w-[15%]">Date</th>
                                <th className="p-3 font-bold text-center pr-6 w-[20%]">Action</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-gray-500 font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-[#017E84]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading pending orders...
                                        </div>
                                    </td>
                                </tr>
                            ) : Array.isArray(pendingPOs) && pendingPOs.length > 0 ? (
                                pendingPOs.map((po) => (
                                    <tr key={po.id} className="hover:bg-teal-50/30 transition-colors group">
                                        <td className="p-3 pl-6 align-middle">
                                                <span className="font-mono font-bold text-gray-800 bg-gray-100 group-hover:bg-white px-2 py-1 rounded border border-gray-200 group-hover:border-teal-200 transition-colors">
                                                    {po.purchaseNumber || po.orderNumber || 'N/A'}
                                                </span>
                                        </td>
                                        <td className="p-3 font-semibold text-gray-900 align-middle">
                                            {po.partner?.name || po.supplier?.name || 'Unknown Supplier'}
                                        </td>
                                        <td className="p-3 text-right text-gray-600 font-medium align-middle">
                                            {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="p-3 pr-6 text-center align-middle">
                                            <Link
                                                href={`/inventory/grn/${po.id}`}
                                                className="inline-block px-4 py-1.5 border border-[#017E84] text-[#017E84] hover:bg-[#017E84] hover:text-white rounded-sm text-xs font-bold uppercase transition-colors shadow-sm"
                                            >
                                                Process Receipt
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-gray-500 font-medium">
                                        No pending purchase orders available.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Export the component wrapped in Suspense
export default function GRNListPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-500 font-medium">
                    <svg className="animate-spin h-5 w-5 text-[#017E84]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </div>
            </div>
        }>
            <GRNListContent />
        </Suspense>
    );
}