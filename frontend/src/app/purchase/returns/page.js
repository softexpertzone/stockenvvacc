'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    Eye,
    CheckCircle,
    Clock,
    Truck,
    XCircle,
    RotateCcw,
    Filter,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

const STATUS_CONFIG = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
    CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    SHIPPED: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: Truck },
    DONE: { label: 'Done', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PurchaseReturnsPage() {
    const router = useRouter();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadReturns = async () => {
            try {
                const res = await apiClient.get('/api/returns/purchase');
                if (isMounted && res.data.success) {
                    setReturns(res.data.data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadReturns();

        return () => {
            isMounted = false;
        };
    }, []);

    const filtered = returns.filter((item) => {
        const matchesSearch =
            item.returnNumber?.toLowerCase().includes(search.toLowerCase()) ||
            item.partner?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
            item.partner?.name?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter ? item.status === statusFilter : true;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <RotateCcw className="w-6 h-6 text-blue-600" />
                        Purchase Returns
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage returns to vendors / suppliers
                    </p>
                </div>

                <Link
                    href="/purchase/returns/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    New Purchase Return
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white border rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by Return No. or Vendor..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        className="border rounded-lg px-3 py-2 text-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DONE">Done</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left px-5 py-3 font-medium text-gray-600">Return No.</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-600">Vendor</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-600">Items</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                            <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                                    No purchase returns found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((item) => {
                                const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.DRAFT;
                                const StatusIcon = status.icon;

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 transition">
                                        <td className="px-5 py-3.5 font-medium text-blue-600">
                                            {item.returnNumber}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {item.partner?.companyName || item.partner?.name || '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {item.items?.length || 0} item(s)
                                        </td>
                                        <td className="px-5 py-3.5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                                                >
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {status.label}
                                                </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                onClick={() => router.push(`/purchase/returns/${item.id}`)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View
                                            </button>
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