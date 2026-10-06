'use client';

import Link from 'next/link';

export default function AccountsDashboard() {
    const sections = [
        {
            title: 'Vouchers',
            description: 'Create and manage accounting vouchers',
            items: [
                {
                    title: 'Receipt Voucher',
                    description: 'Record money received',
                    href: '/accounts/vouchers/receipt',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    ),
                    color: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
                },
                {
                    title: 'Payment Voucher',
                    description: 'Record money paid',
                    href: '/accounts/vouchers/payment',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                    ),
                    color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100',
                },
                {
                    title: 'Contra Voucher',
                    description: 'Cash / bank transfers',
                    href: '/accounts/vouchers/contra',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                    ),
                    color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
                },
                {
                    title: 'Journal Voucher',
                    description: 'General journal entries',
                    href: '/accounts/vouchers/journal',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                    ),
                    color: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
                },
                {
                    title: 'Voucher Register',
                    description: 'View all vouchers',
                    href: '/accounts/vouchers',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                        </svg>
                    ),
                    color: 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100',
                },
            ],
        },
        {
            title: 'Masters',
            description: 'Chart of accounts and ledgers',
            items: [
                {
                    title: 'Account Groups',
                    description: 'Manage account groups',
                    href: '/accounts/masters/groups',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                    ),
                    color: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
                },
                {
                    title: 'Ledgers',
                    description: 'Manage ledger accounts',
                    href: '/accounts/masters/ledgers',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                        </svg>
                    ),
                    color: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
                },
                {
                    title: 'Chart of Accounts',
                    description: 'Full account hierarchy',
                    href: '/accounts/masters/chart-of-accounts',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                    ),
                    color: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
                },
            ],
        },
        {
            title: 'Reports',
            description: 'Financial statements and ledgers',
            items: [
                {
                    title: 'Trial Balance',
                    description: 'Debit & credit summary',
                    href: '/accounts/reports/trial-balance',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                    ),
                    color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
                },
                {
                    title: 'Profit & Loss',
                    description: 'Income statement',
                    href: '/accounts/reports/profit-loss',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                        </svg>
                    ),
                    color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
                },
                {
                    title: 'Balance Sheet',
                    description: 'Assets, liabilities & equity',
                    href: '/accounts/reports/balance-sheet',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21l3.75-3.75" />
                        </svg>
                    ),
                    color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
                },
                {
                    title: 'General Ledger',
                    description: 'Account-wise transactions',
                    href: '/accounts/reports/general-ledger',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                    ),
                    color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
                },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-800 tracking-tight">Accounts</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Manage vouchers, masters and financial reports
                </p>
            </div>

            <div className="p-6 space-y-8">
                {sections.map((section) => (
                    <div key={section.title}>
                        {/* Section Header */}
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                {section.title}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {section.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        group flex items-start gap-4 p-4
                                        bg-white border rounded-lg shadow-sm
                                        transition-all duration-150
                                        hover:shadow-md hover:-translate-y-0.5
                                        ${item.color}
                                    `}
                                >
                                    <div className="flex-shrink-0 mt-0.5 opacity-80 group-hover:opacity-100">
                                        {item.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-sm leading-tight">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs mt-1 opacity-75 leading-snug">
                                            {item.description}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}