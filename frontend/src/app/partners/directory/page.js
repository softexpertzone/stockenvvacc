'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { hasPermission, PERMISSIONS } from '@/config/permissions';

// Roles that can see Vendors (suppliers)
const PURCHASE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PURCHASER', 'PURCHASE_VIEWER'];

// Roles that can see Buyers
const SALES_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SALESPERSON', 'SALES_VIEWER'];

// Roles that are allowed to create / register partners
const CAN_REGISTER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PURCHASER', 'SALESPERSON'];

function PartnerDirectoryContent() {
    const searchParams = useSearchParams();

    const [type, setType] = useState(null);
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);

    // 1. Load user role + decide default type (lint-safe)
    useEffect(() => {
        let cancelled = false;

        const loadUserAndType = () => {
            try {
                const stored = localStorage.getItem('user');
                if (!stored) return;

                const user = JSON.parse(stored);
                const role = user.role;

                if (cancelled) return;

                setUserRole(role);

                // Priority: URL query param → then role-based default
                const urlType = searchParams.get('type'); // VENDOR or BUYER

                if (urlType === 'VENDOR' || urlType === 'BUYER') {
                    if (urlType === 'VENDOR' && PURCHASE_ROLES.includes(role)) {
                        setType('VENDOR');
                    } else if (urlType === 'BUYER' && SALES_ROLES.includes(role)) {
                        setType('BUYER');
                    } else if (PURCHASE_ROLES.includes(role)) {
                        setType('VENDOR');
                    } else if (SALES_ROLES.includes(role)) {
                        setType('BUYER');
                    }
                } else {
                    // No query param → role default
                    if (PURCHASE_ROLES.includes(role) && !SALES_ROLES.includes(role)) {
                        setType('VENDOR');
                    } else if (SALES_ROLES.includes(role) && !PURCHASE_ROLES.includes(role)) {
                        setType('BUYER');
                    } else {
                        setType('VENDOR'); // Admin / Super Admin default
                    }
                }
            } catch (e) {
                console.error('Failed to read user role', e);
            }
        };

        // Small delay avoids the synchronous setState lint error
        const timer = setTimeout(loadUserAndType, 0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [searchParams]);

    const canSeeBoth = useMemo(() => {
        if (!userRole) return false;
        return PURCHASE_ROLES.includes(userRole) && SALES_ROLES.includes(userRole);
    }, [userRole]);

    const canRegister = useMemo(() => {
        if (!userRole) return false;
        // Prefer permission system if available, otherwise fall back to role list
        if (typeof hasPermission === 'function' && PERMISSIONS?.PARTNERS_MANAGE) {
            return hasPermission(userRole, [PERMISSIONS.PARTNERS_MANAGE]);
        }
        return CAN_REGISTER_ROLES.includes(userRole);
    }, [userRole]);

    // 2. Fetch partners whenever type is ready
    useEffect(() => {
        if (!type) return;

        let isActive = true;

        const loadPartners = async () => {
            setLoading(true);
            try {
                const { data } = await apiClient.get(`/partners?type=${type}`);
                // Support different response shapes
                const list = data?.data?.data || data?.data || data || [];
                if (isActive) {
                    setPartners(Array.isArray(list) ? list : []);
                }
            } catch (err) {
                console.error('Fetch error:', err);
                if (isActive) setPartners([]);
            } finally {
                if (isActive) setLoading(false);
            }
        };

        loadPartners();
        return () => {
            isActive = false;
        };
    }, [type]);

    // Page title
    const pageTitle = canSeeBoth
        ? 'Partner Directory'
        : type === 'VENDOR'
            ? 'Suppliers (Vendors)'
            : 'Buyers';

    return (
        <div className="p-4 md:p-8 bg-[#f9fafb] min-h-screen text-[#374151]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">
                    {pageTitle}
                </h1>

                {/* Only show Register button for roles that can create partners */}
                {canRegister && (
                    <Link
                        href="/partners/register"
                        className="bg-[#017E84] text-white px-6 py-2.5 rounded-sm font-semibold hover:opacity-90 transition shadow-sm text-sm tracking-wide whitespace-nowrap"
                    >
                        + Register New
                    </Link>
                )}
            </div>

            {/* Tabs – only for roles that can see BOTH */}
            {canSeeBoth && (
                <div className="flex gap-6 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setType('VENDOR')}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                            type === 'VENDOR'
                                ? 'text-[#017E84] border-b-2 border-[#017E84]'
                                : 'text-gray-500 hover:text-[#374151]'
                        }`}
                    >
                        Suppliers (Vendors)
                    </button>
                    <button
                        onClick={() => setType('BUYER')}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                            type === 'BUYER'
                                ? 'text-[#017E84] border-b-2 border-[#017E84]'
                                : 'text-gray-500 hover:text-[#374151]'
                        }`}
                    >
                        Buyers
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading || !type ? (
                <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-sm shadow-sm relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                    Loading records...
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE */}
                    <div className="hidden md:block bg-white border border-gray-200 rounded-sm shadow-sm relative">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                        <div className="overflow-x-auto mt-1">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tax ID</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {partners.length > 0 ? (
                                    partners.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-semibold text-[#374151] max-w-[200px] truncate">
                                                {p.companyName}
                                            </td>
                                            <td className="p-4 text-gray-600 truncate max-w-[150px]">
                                                {p.name || '-'}
                                            </td>
                                            <td className="p-4 text-gray-600 whitespace-nowrap">
                                                {p.phone}
                                            </td>
                                            <td className="p-4 text-gray-600 truncate max-w-[180px]">
                                                {p.email || 'N/A'}
                                            </td>
                                            <td className="p-4 text-gray-500 font-mono text-xs whitespace-nowrap">
                                                {p.taxId || '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                {canRegister && (
                                                    <button className="text-[#017E84] hover:opacity-80 font-bold text-xs uppercase tracking-wider transition-opacity">
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-gray-500 italic">
                                            No partners found in this category.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MOBILE CARDS */}
                    <div className="md:hidden flex flex-col gap-4">
                        {partners.length > 0 ? (
                            partners.map((p) => (
                                <div
                                    key={p.id}
                                    className="bg-white border border-gray-200 rounded-sm shadow-sm relative p-5"
                                >
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                                    <div className="flex justify-between items-start mb-3 gap-2">
                                        <h3 className="font-bold text-lg text-[#374151] leading-tight truncate">
                                            {p.companyName}
                                        </h3>
                                        {canRegister && (
                                            <button className="text-[#017E84] hover:opacity-80 font-bold text-xs uppercase tracking-wider shrink-0 mt-1">
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                                        <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                            <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                                                Contact
                                            </span>
                                            <span className="font-medium truncate ml-4">
                                                {p.name || '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                            <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                                                Phone
                                            </span>
                                            <span className="font-medium">{p.phone}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                            <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                                                Email
                                            </span>
                                            <span className="font-medium truncate ml-4">
                                                {p.email || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                                                Tax ID
                                            </span>
                                            <span className="font-mono text-xs">{p.taxId || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-sm shadow-sm relative p-8 text-center text-gray-500 italic">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                                No partners found in this category.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// Export wrapped inside Suspense
export default function PartnerDirectory() {
    return (
        <Suspense fallback={
            <div className="p-12 text-center text-gray-500 font-medium bg-white border border-gray-200 rounded-sm shadow-sm relative min-h-screen">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                Loading partner directory...
            </div>
        }>
            <PartnerDirectoryContent />
        </Suspense>
    );
}