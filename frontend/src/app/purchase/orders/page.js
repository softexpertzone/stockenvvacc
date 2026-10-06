'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';
import { hasPermission, PERMISSIONS } from '@/config/permissions';

export default function PurchaseOrdersPage() {
    const [userRole, setUserRole] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter state
    const [selectedMonth, setSelectedMonth] = useState(''); // '' = All
    const [selectedYear, setSelectedYear] = useState('');   // '' = All

// Get current user role (lint-safe)
    useEffect(() => {
        let cancelled = false;

        const loadUserRole = () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (!cancelled) {
                    setUserRole(user?.role || null);
                }
            } catch {
                if (!cancelled) {
                    setUserRole(null);
                }
            }
        };

        // Small delay avoids the synchronous setState lint error
        const timer = setTimeout(loadUserRole, 0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, []);

    // Fetch purchase orders
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data } = await apiClient.get('/purchase/orders');
                if (data.success) {
                    setOrders(data.data || []);
                } else {
                    setError(data.error || data.message || 'Failed to fetch purchase orders.');
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch purchase orders.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // Available years from the data (dynamic)
    const availableYears = useMemo(() => {
        const years = new Set();
        orders.forEach((o) => {
            if (o.createdAt) {
                years.add(new Date(o.createdAt).getFullYear());
            }
        });
        return Array.from(years).sort((a, b) => b - a); // newest first
    }, [orders]);

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            if (!order.createdAt) return false;
            const date = new Date(order.createdAt);
            const month = date.getMonth() + 1; // 1-12
            const year = date.getFullYear();

            const monthMatch = selectedMonth === '' || month === Number(selectedMonth);
            const yearMatch = selectedYear === '' || year === Number(selectedYear);

            return monthMatch && yearMatch;
        });
    }, [orders, selectedMonth, selectedYear]);

    const getStatusStyle = (status) => {
        if (status === 'RECEIVED') return 'bg-green-50 text-green-700 border-green-200';
        if (status === 'PENDING' || status === 'DRAFT') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        return 'bg-gray-50 text-gray-700 border-gray-200';
    };

    const months = [
        { value: '', label: 'All Months' },
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    if (loading) {
        return (
            <div className="p-4 md:p-8 bg-[#f9fafb] min-h-screen text-[#374151]">
                <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-sm shadow-sm relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                    <p className="animate-pulse">Loading purchase orders...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 md:p-8 bg-[#f9fafb] min-h-screen text-[#374151]">
                <div className="p-12 text-center text-red-600 font-medium bg-white border border-gray-200 rounded-sm shadow-sm relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-sm"></div>
                    <strong>Error:</strong> {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-[#f9fafb] min-h-screen text-[#374151]">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-gray-900">
                        Purchase Orders
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage and track your incoming vendor orders.
                    </p>
                </div>

                {/* Only show Create PO button if user has permission */}
                {hasPermission(userRole, [PERMISSIONS.PO_CREATE]) && (
                    <Link
                        href="/purchase/new"
                        className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-sm font-semibold transition shadow-sm text-sm tracking-wide whitespace-nowrap"
                    >
                        + Create PO
                    </Link>
                )}
            </div>

            {/* Month + Year Filter */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                    <div className="w-full sm:w-48">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Month
                        </label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#017E84] focus:border-transparent"
                        >
                            {months.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full sm:w-40">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Year
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#017E84] focus:border-transparent"
                        >
                            <option value="">All Years</option>
                            {availableYears.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedMonth('');
                            setSelectedYear('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors"
                    >
                        Clear Filters
                    </button>

                    <div className="sm:ml-auto text-sm text-gray-500 self-center">
                        Showing <span className="font-semibold text-gray-800">{filteredOrders.length}</span> of {orders.length} orders
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* DESKTOP VIEW */}
                <div className="hidden md:block bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                    <div className="overflow-x-auto mt-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-4 py-4">PO Number</th>
                                <th className="px-4 py-4">Vendor / Supplier</th>
                                <th className="px-4 py-4">Date</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4 text-center">Action</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-12 text-center text-gray-500 italic">
                                        No purchase orders found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-[#017E84] whitespace-nowrap">
                                            {order.purchaseNumber}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 font-medium">
                                            {order.partner?.companyName || order.partner?.name || 'Unknown Vendor'}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                                            {new Date(order.createdAt).toLocaleDateString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2.5 py-1 text-xs font-bold rounded-sm border uppercase tracking-wider ${getStatusStyle(
                                                        order.status
                                                    )}`}
                                                >
                                                    {order.status || 'PENDING'}
                                                </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <Link
                                                href={`/purchase/orders/${order.id}`}
                                                className="text-[#017E84] hover:opacity-80 font-bold text-xs uppercase tracking-wider transition-opacity whitespace-nowrap"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MOBILE VIEW */}
                <div className="md:hidden flex flex-col gap-4">
                    {filteredOrders.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-sm shadow-sm relative p-8 text-center text-gray-500 italic">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                            No purchase orders found for the selected filters.
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white border border-gray-200 rounded-sm shadow-sm relative p-5"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>

                                <div className="flex justify-between items-start mb-3 gap-2">
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                                            PO Number
                                        </div>
                                        <h3 className="font-bold text-lg text-[#017E84] leading-tight truncate">
                                            {order.purchaseNumber}
                                        </h3>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold uppercase tracking-wider rounded-sm shrink-0 mt-1 border ${getStatusStyle(
                                            order.status
                                        )}`}
                                    >
                                        {order.status || 'PENDING'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 mt-4">
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                        <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                                            Vendor
                                        </span>
                                        <span className="font-medium truncate ml-4 text-gray-800">
                                            {order.partner?.companyName || order.partner?.name || 'Unknown Vendor'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-2 pt-1">
                                        <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                                            Date
                                        </span>
                                        <span className="font-medium">
                                            {new Date(order.createdAt).toLocaleDateString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>

                                    <div className="pt-3 pb-1 flex justify-end mt-1">
                                        <Link
                                            href={`/purchase/orders/${order.id}`}
                                            className="text-[#017E84] hover:opacity-80 font-bold text-xs uppercase tracking-wider transition-opacity flex items-center gap-1"
                                        >
                                            View Details →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}