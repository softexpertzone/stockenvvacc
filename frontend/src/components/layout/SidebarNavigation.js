'use client';

import { useState, useMemo, useSyncExternalStore, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { SIDEBAR_CONFIG } from '@/config/navigation';
import { hasPermission, PERMISSIONS } from '@/config/permissions';
import { useCompanyModules } from '@/hooks/useCompanyModules';
import { SECTION_TO_MODULE } from '@/config/modules';
import {
    ShoppingCart,
    PackagePlus,
    Users,
    LayoutDashboard,
    Warehouse,
    ArrowRightLeft,
    FileText,
    Settings,
    Tags,
    Boxes,
    ClipboardList,
    Truck,
    LogOut,
    Menu,
    X,
    ChevronRight,
    BookOpen,
    BarChart3,
    Shield,
    Building2,
    Layers,
    RotateCcw,
} from 'lucide-react';

// ---------- cached localStorage reader ----------
let cachedRaw = null;
let cachedUser = null;

function getSnapshot() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('user');
    if (raw === cachedRaw) return cachedUser;
    cachedRaw = raw;
    try {
        cachedUser = raw ? JSON.parse(raw) : null;
    } catch {
        cachedUser = null;
    }
    return cachedUser;
}

function getServerSnapshot() {
    return null;
}

function subscribe(callback) {
    const onStorage = () => {
        cachedRaw = null;
        callback();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('user-updated', onStorage);
    return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('user-updated', onStorage);
    };
}
// ------------------------------------------------

function getLinkIcon(link) {
    const href = (link.href || '').toLowerCase();
    const label = (link.label || '').toLowerCase();

    if (href.includes('dashboard') || label.includes('dashboard')) return LayoutDashboard;
    if (href.includes('return') || label.includes('return')) return RotateCcw;
    if (href.includes('purchase') || label.includes('purchase')) return ClipboardList;
    if (href.includes('sale') || href.includes('checkout') || label.includes('sale')) return ShoppingCart;
    if (href.includes('partner') || label.includes('partner') || label.includes('supplier') || label.includes('customer')) return Users;
    if (href.includes('transfer') || label.includes('transfer')) return ArrowRightLeft;
    if (href.includes('ledger') || label.includes('ledger')) return BookOpen;
    if (href.includes('warehouse') || href.includes('godown') || label.includes('warehouse') || label.includes('godown')) return Warehouse;
    if (href.includes('inventory') || href.includes('stock') || label.includes('stock') || label.includes('inventory')) return Boxes;
    if (href.includes('product') || href.includes('catalog') || label.includes('product') || label.includes('catalog')) return PackagePlus;
    if (href.includes('attribute') || label.includes('attribute')) return Tags;
    if (href.includes('report') || label.includes('report')) return BarChart3;
    if (href.includes('setting') || label.includes('setting')) return Settings;
    if (href.includes('user') || href.includes('role') || label.includes('user') || label.includes('role')) return Shield;
    if (href.includes('brand') || label.includes('brand')) return Building2;
    if (href.includes('category') || label.includes('category')) return Layers;
    if (href.includes('dispatch') || href.includes('shipment') || label.includes('dispatch')) return Truck;
    if (href.includes('po') || label.includes('order')) return FileText;

    return ChevronRight;
}

function SidebarContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const userRole = user?.role || null;

    // ===== MODULE CONTROL =====
    const { modules, loading: modulesLoading } = useCompanyModules();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
        cachedRaw = null;
        cachedUser = null;
        window.dispatchEvent(new Event('user-updated'));
        router.push('/auth/login');
    };

    const isActive = (path) => {
        if (path.includes('?')) {
            const currentQueryString = searchParams.toString();
            const fullCurrentPath = currentQueryString
                ? `${pathname}?${currentQueryString}`
                : pathname;
            return fullCurrentPath === path;
        }
        if (path === '/dashboard') return pathname === '/dashboard';
        return pathname === path || pathname.startsWith(`${path}/`);
    };

    const userModules = user?.allowedModules || [];

    const authorizedSections = useMemo(() => {
        if (!userRole) return [];

        const isSuperAdmin = userRole === 'SUPER_ADMIN';

        return SIDEBAR_CONFIG
            .map((section) => {
                const moduleKey = SECTION_TO_MODULE[section.title];

                // Super Admin sees everything that is globally enabled
                if (!isSuperAdmin) {
                    // 1. Global module must be ON
                    if (moduleKey && modules[moduleKey] === false) return null;

                    // 2. User must have this module in allowedModules
                    if (moduleKey && !userModules.includes(moduleKey)) return null;
                } else {
                    // Super Admin still respects global OFF switch
                    if (moduleKey && modules[moduleKey] === false) return null;
                }

                const allowedLinks = section.links.filter((link) =>
                    hasPermission(userRole, link.permissions)
                );
                return { ...section, links: allowedLinks };
            })
            .filter((section) => section && section.links.length > 0);
    }, [userRole, modules, userModules]);

    return (
        <>
            {/* Mobile Menu Trigger */}
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-md"
                onClick={() => setIsMobileOpen((prev) => !prev)}
                aria-label="Toggle Navigation Menu"
            >
                {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-gray-900 border-r border-gray-700 flex flex-col z-50 transition-transform shrink-0 ${
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                {/* Quick Action Buttons */}
                <div className="p-4 flex-shrink-0 space-y-2 border-b border-gray-700 mt-2">
                    {hasPermission(userRole, [PERMISSIONS.PO_CREATE]) && (
                        <Link
                            href="/purchase/new"
                            onClick={() => setIsMobileOpen(false)}
                            className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2 px-4 rounded-md text-[13px] font-medium transition-colors shadow-sm"
                        >
                            <ClipboardList className="w-4 h-4" />
                            New Purchase Order
                        </Link>
                    )}

                    {hasPermission(userRole, [PERMISSIONS.SALES_CREATE]) && (
                        <Link
                            href="/checkout"
                            onClick={() => setIsMobileOpen(false)}
                            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 px-4 rounded-md border border-gray-600 text-[13px] font-medium transition-colors"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            New Sale
                        </Link>
                    )}

                    {hasPermission(userRole, [PERMISSIONS.PARTNERS_MANAGE]) && (
                        <Link
                            href="/partners/register"
                            onClick={() => setIsMobileOpen(false)}
                            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 px-4 rounded-md border border-gray-600 text-[13px] font-medium transition-colors"
                        >
                            <Users className="w-4 h-4" />
                            Register New Partner
                        </Link>
                    )}
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-4 px-2 erp-sidebar-scroll space-y-6">
                    {authorizedSections.map((section) => (
                        <div key={section.title}>
                            <h3 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 select-none">
                                {section.title}
                            </h3>
                            <div className="space-y-0.5">
                                {section.links.map((link) => {
                                    const Icon = getLinkIcon(link);
                                    const active = isActive(link.href);
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsMobileOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-colors border-l-4 rounded-r-md ${
                                                active
                                                    ? 'bg-blue-900/30 text-blue-400 border-blue-500'
                                                    : 'text-gray-300 border-transparent hover:text-white hover:bg-gray-800'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                                            <span className="truncate">{link.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer — Sign out */}
                <div className="h-14 flex-shrink-0 border-t border-gray-700 bg-gray-900 flex items-center justify-center px-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-red-400 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}

export default function SidebarNavigation() {
    return (
        <Suspense fallback={<div className="w-64 h-screen bg-gray-900 border-r border-gray-700 hidden md:block shrink-0" />}>
            <SidebarContent />
        </Suspense>
    );
}