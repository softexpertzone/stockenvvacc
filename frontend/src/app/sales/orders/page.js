'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE, API_ENDPOINTS } from '@/config/apiEndpoints';
import { hasPermission, PERMISSIONS } from '@/config/permissions';

export default function SalesOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null);

    // Load user role (lint-safe)
    useEffect(() => {
        let cancelled = false;

        const loadUserRole = () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (!cancelled) setUserRole(user?.role || null);
            } catch {
                if (!cancelled) setUserRole(null);
            }
        };

        const timer = setTimeout(loadUserRole, 0);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        fetch(`${API_BASE}${API_ENDPOINTS.SALES.ORDERS}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setOrders(data.data || []);
                } else {
                    setError(data.error || 'Failed to fetch sales orders');
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const getStatusStyle = (status) => {
        const s = status?.toUpperCase() || '';
        if (s.includes('PAID') && !s.includes('PARTIAL')) {
            return 'bg-green-100 text-green-800 border border-green-200';
        }
        if (s.includes('PARTIAL')) {
            return 'bg-blue-100 text-blue-800 border border-blue-200';
        }
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    };

    const getOrderFinancials = (order) => {
        const total = Number(
            order.totalAmount || order.grandTotal || order.total || order.total_amount || 0
        );
        const courier = Number(
            order.courierCost || order.shippingCost || order.shipping || order.deliveryFee ||
            order.shippingCharge || order.deliveryCharge || order.courier_cost ||
            order.shipping_cost || order.delivery_fee || 0
        );
        const paid = Number(
            order.receivedAmount ?? order.paidAmount ?? order.advanceAmount ?? order.paid ??
            order.advance ?? order.amountPaid ?? order.totalPaid ?? order.received_amount ??
            order.paid_amount ?? order.advance_amount ?? 0
        );
        const due = Number(
            order.balanceDue ?? order.dueAmount ?? order.due ?? order.balance ??
            order.balance_due ?? order.due_amount ?? Math.max(0, total - paid)
        );
        return { total, courier, paid, due };
    };

    if (loading) {
        return (
            <div className="p-4 md:p-8 bg-[#f9fafb] min-h-screen text-[#374151]">
                <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-sm shadow-sm relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                    Loading sales orders...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 md:p-8 bg-[#f9fafb] min-h-screen text-[#374151]">
                <div className="p-12 text-center text-red-600 font-medium bg-white border border-gray-200 rounded-sm shadow-sm relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-sm"></div>
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-[#f9fafb] min-h-screen text-[#374151]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">
                    Sales Orders
                </h1>

                {/* Only users with SALES_CREATE can see this button */}
                {hasPermission(userRole, [PERMISSIONS.SALES_CREATE]) && (
                    <Link
                        href="/sales/new"
                        className="bg-[#017E84] text-white px-6 py-2.5 rounded-sm font-semibold hover:opacity-90 transition shadow-sm text-sm tracking-wide whitespace-nowrap"
                    >
                        + New Sale / Checkout
                    </Link>
                )}
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-sm shadow-sm relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                <div className="overflow-x-auto mt-1">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice #</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order Ref</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-12 text-center text-gray-500 italic">
                                    No sales orders found.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => {
                                const { total, courier, paid, due } = getOrderFinancials(order);
                                return (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-semibold text-[#017E84] whitespace-nowrap">
                                            {order.invoiceNumber}
                                        </td>
                                        <td className="p-4 text-gray-600 truncate max-w-[150px]">
                                            {order.orderRef || 'N/A'}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-bold uppercase tracking-wider rounded-sm ${getStatusStyle(order.status)}`}>
                                                    {order.status}
                                                </span>
                                        </td>
                                        <td className="p-4 text-gray-500 whitespace-nowrap">
                                            {order.createdAt
                                                ? new Date(order.createdAt).toLocaleDateString('en-GB')
                                                : 'N/A'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                href={`/sales/orders/${order.id}`}
                                                className="text-[#017E84] hover:opacity-80 font-bold text-xs uppercase tracking-wider transition-opacity"
                                            >
                                                View / Print
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MOBILE VIEW */}
            <div className="md:hidden flex flex-col gap-4">
                {orders.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm relative p-8 text-center text-gray-500 italic">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                        No sales orders found.
                    </div>
                ) : (
                    orders.map((order) => {
                        const { total, courier, paid, due } = getOrderFinancials(order);
                        return (
                            <div key={order.id} className="bg-white border border-gray-200 rounded-sm shadow-sm relative p-5">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>

                                <div className="flex justify-between items-start mb-3 gap-2">
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                                            Invoice #
                                        </div>
                                        <h3 className="font-bold text-lg text-[#017E84] leading-tight truncate">
                                            {order.invoiceNumber}
                                        </h3>
                                    </div>
                                    <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold uppercase tracking-wider rounded-sm shrink-0 mt-1 ${getStatusStyle(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 mt-4">
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                        <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                                            Order Ref
                                        </span>
                                        <span className="font-medium truncate ml-4">
                                            {order.orderRef || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                        <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                                            Date
                                        </span>
                                        <span className="font-medium">
                                            {order.createdAt
                                                ? new Date(order.createdAt).toLocaleDateString('en-GB')
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="pt-3 pb-1 flex justify-end mt-1">
                                        <Link
                                            href={`/sales/orders/${order.id}`}
                                            className="text-[#017E84] hover:opacity-80 font-bold text-xs uppercase tracking-wider transition-opacity flex items-center gap-1"
                                        >
                                            View / Print →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}