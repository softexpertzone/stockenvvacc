'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import {
    TrendingUp,
    ShoppingCart,
    Package,
    AlertTriangle,
    Truck,
    Wallet,
    CreditCard,
    Boxes,
    Clock,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

/** Project theme */
const TEAL = '#017E84';

/**
 * Soft tones around project teal — label / value / icon / hover differ per card
 * but stay on-brand (no loud rainbow).
 */
const TONES = {
    salesToday: {
        label: '#0d9488',
        value: '#017E84',
        icon: '#017E84',
        iconBg: '#e6f4f5',
        hoverBg: '#f0fafa',
        hoverBorder: '#017E84'
    },
    salesMtd: {
        label: '#0f766e',
        value: '#0f766e',
        icon: '#0f766e',
        iconBg: '#e0f2f1',
        hoverBg: '#eef8f7',
        hoverBorder: '#0f766e'
    },
    ar: {
        label: '#0369a1',
        value: '#0284c7',
        icon: '#0284c7',
        iconBg: '#e0f2fe',
        hoverBg: '#f0f9ff',
        hoverBorder: '#0284c7'
    },
    deliveries: {
        label: '#1d4ed8',
        value: '#2563eb',
        icon: '#2563eb',
        iconBg: '#eff6ff',
        hoverBg: '#f5f8ff',
        hoverBorder: '#2563eb'
    },
    purchToday: {
        label: '#6d28d9',
        value: '#7c3aed',
        icon: '#7c3aed',
        iconBg: '#f5f3ff',
        hoverBg: '#faf8ff',
        hoverBorder: '#7c3aed'
    },
    purchMtd: {
        label: '#5b21b6',
        value: '#6d28d9',
        icon: '#6d28d9',
        iconBg: '#f3e8ff',
        hoverBg: '#faf5ff',
        hoverBorder: '#6d28d9'
    },
    ap: {
        label: '#b45309',
        value: '#c2410c',
        icon: '#c2410c',
        iconBg: '#fff7ed',
        hoverBg: '#fffaf5',
        hoverBorder: '#c2410c'
    },
    receipts: {
        label: '#a16207',
        value: '#ca8a04',
        icon: '#ca8a04',
        iconBg: '#fefce8',
        hoverBg: '#fffef5',
        hoverBorder: '#ca8a04'
    },
    lowStock: {
        label: '#b45309',
        value: '#d97706',
        icon: '#d97706',
        iconBg: '#fffbeb',
        hoverBg: '#fff8eb',
        hoverBorder: '#d97706'
    },
    skus: {
        label: '#475569',
        value: '#334155',
        icon: '#017E84',
        iconBg: '#e6f4f5',
        hoverBg: '#f0fafa',
        hoverBorder: '#017E84'
    },
    cash: {
        label: '#047857',
        value: '#059669',
        icon: '#059669',
        iconBg: '#ecfdf5',
        hoverBg: '#f0fdf8',
        hoverBorder: '#059669'
    }
};

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const statRes = await apiClient.get('/dashboard/stats');
                setStats(statRes.data?.data || statRes.data);
            } catch (err) {
                console.error('Dashboard Load Error:', err);
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    router.push('/auth/login');
                    return;
                }
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const formatMoney = (val) => {
        const n = Number(val) || 0;
        return n.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest animate-pulse">
                    Loading dashboard…
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white p-8 flex items-center justify-center">
                <p className="text-gray-500 text-sm">{error}</p>
            </div>
        );
    }

    const monthLabel = stats?.period?.monthLabel || 'This Month';
    const lowStock = Number(stats?.lowStockCount) || 0;

    return (
        <div className="min-h-screen bg-white text-gray-700">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-gray-100 pb-4">
                    <div>
                        <h1
                            className="text-xl md:text-2xl font-semibold tracking-tight"
                            style={{ color: TEAL }}
                        >
                            Warehouse Command Center
                        </h1>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">
                            Live sales · purchases · stock health
                        </p>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{monthLabel}</span>
                </header>

                {/* Sales */}
                <section>
                    <h2
                        className="text-sm font-semibold mb-3 pb-1 border-b-2 inline-block"
                        style={{ color: TEAL, borderColor: TEAL }}
                    >
                        Sales
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-1">
                        <Card
                            label="Today's Sales"
                            value={`$${formatMoney(stats?.dailySales)}`}
                            sub={`${stats?.todayOrderCount || 0} orders`}
                            icon={ArrowUpRight}
                            tone={TONES.salesToday}
                        />


                        <Card
                            label="Pending Deliveries"
                            value={String(stats?.pendingDeliveries ?? 0)}
                            sub="Awaiting dispatch"
                            icon={Truck}
                            tone={TONES.deliveries}
                        />
                    </div>
                </section>

                {/* Purchases */}
                <section>
                    <h2
                        className="text-sm font-semibold mb-3 pb-1 border-b-2 inline-block"
                        style={{ color: TEAL, borderColor: TEAL }}
                    >
                        Purchases
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-1">
                        <Card
                            label="Today's Purchases"
                            value={`$${formatMoney(stats?.dailyPurchases)}`}
                            sub={`${stats?.todayPOCount || 0} POs`}
                            icon={ArrowDownRight}
                            tone={TONES.purchToday}
                        />


                        <Card
                            label="Pending Receipts"
                            value={String(stats?.pendingReceipts ?? 0)}
                            sub="POs awaiting GRN"
                            icon={Clock}
                            tone={TONES.receipts}
                        />
                    </div>
                </section>

                {/* Stock Health */}
                <section>
                    <h2
                        className="text-sm font-semibold mb-3 pb-1 border-b-2 inline-block"
                        style={{ color: TEAL, borderColor: TEAL }}
                    >
                        Stock Health
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
                        <Card
                            label="Low Stock Alerts"
                            value={String(lowStock)}
                            sub="Below minimum level"
                            icon={AlertTriangle}
                            tone={TONES.lowStock}
                            alert={lowStock > 0}
                        />
                        <Card
                            label="Active SKUs"
                            value={String(stats?.totalVariants ?? 0)}
                            sub="Product variants"
                            icon={Package}
                            tone={TONES.skus}
                        />
                    </div>
                </section>

                {/* Top Products */}
                {Array.isArray(stats?.topProducts) && stats.topProducts.length > 0 && (
                    <section>
                        <h2
                            className="text-sm font-semibold mb-3 pb-1 border-b-2 inline-block"
                            style={{ color: TEAL, borderColor: TEAL }}
                        >
                            Top Products — {monthLabel}
                        </h2>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-1">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-left font-semibold w-10">#</th>
                                    <th className="px-4 py-2.5 text-left font-semibold">Code / SKU</th>
                                    <th className="px-4 py-2.5 text-left font-semibold">Product Name</th>
                                    <th className="px-4 py-2.5 text-right font-semibold">Qty Sold</th>
                                </tr>
                                </thead>
                                <tbody>
                                {stats.topProducts.map((p, idx) => (
                                    <tr
                                        key={p.productVariantId || idx}
                                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                                            {p.sku}
                                        </td>
                                        <td className="px-4 py-2.5 font-medium text-gray-800">
                                            {p.name}
                                        </td>
                                        <td
                                            className="px-4 py-2.5 text-right font-semibold"
                                            style={{ color: TEAL }}
                                        >
                                            {Number.isFinite(Number(p.qty))
                                                ? Number(p.qty).toLocaleString()
                                                : '0'}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function Card({ label, value, sub, icon: Icon, tone, alert = false }) {
    const t = tone || TONES.skus;

    return (
        <div
            className="group rounded-lg p-5 border border-gray-200 bg-white transition-all duration-200 cursor-default"
            style={{
                // default styles; hover handled via onMouseEnter/Leave for dynamic tone
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = t.hoverBg;
                e.currentTarget.style.borderColor = t.hoverBorder;
                e.currentTarget.style.boxShadow = `0 4px 12px ${t.hoverBorder}18`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = alert ? t.iconBg : '#ffffff';
                e.currentTarget.style.borderColor = alert ? t.hoverBorder : '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                {/* Label — unique color per card */}
                <p
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: t.label }}
                >
                    {label}
                </p>
                {/* Icon in soft circle — matches card meaning */}
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: t.iconBg, color: t.icon }}
                >
                    {Icon && <Icon className="w-4 h-4" />}
                </div>
            </div>

            {/* Value — different color from label */}
            <p
                className="text-2xl font-semibold tabular-nums leading-none"
                style={{ color: t.value }}
            >
                {value}
            </p>

            {sub && (
                <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
            )}
        </div>
    );
}
