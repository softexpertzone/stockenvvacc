'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StoreProvider from '@/store/StoreProvider';
import './globals.css';
import SidebarNavigation from '@/components/layout/SidebarNavigation';
import TopHeader from '@/components/layout/TopHeader'; // ADDED: Import the new header

export default function RootLayout({ children }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/' || pathname?.startsWith('/auth');

    // REMOVED: useSelector and userName variables from here

    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <html lang="en" suppressHydrationWarning={true}>
        <head>
            <link
                rel="stylesheet"
                href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
            />
        </head>
        <body className="bg-gray-100 text-gray-900 antialiased min-h-screen overflow-x-hidden" suppressHydrationWarning={true}>
        <StoreProvider>
            <QueryClientProvider client={queryClient}>
                {isAuthPage ? (
                    <main className="min-h-screen bg-gray-50 flex flex-col w-full">
                        {children}
                    </main>
                ) : (
                    <div className="flex min-h-screen w-full">
                        <SidebarNavigation />

                        {/* Main column */}
                        <div className="flex-1 flex flex-col min-w-0 bg-[#f9fafb] shadow-inner md:w-[calc(100%-16rem)] h-screen">

                            {/* REPLACED: Use the newly extracted TopHeader component */}
                            <TopHeader />

                            {/* Scrollable page content */}
                            <main className="flex-1 overflow-y-auto overflow-x-auto">
                                <div className="p-4 md:p-8 w-full">
                                    {children}
                                </div>
                            </main>

                            {/* Thin bottom footer */}
                            <footer className="shrink-0 h-10 border-t border-gray-200 bg-[#e8eaed] flex items-center justify-center px-4">
                                <p className="text-[11px] text-gray-600">
                                    Developed by{' '}
                                    <a
                                        href="https://www.softexpertzone.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#017E84] hover:underline font-medium"
                                    >
                                        www.softexpertzone.com
                                    </a>
                                </p>
                            </footer>
                        </div>
                    </div>
                )}
            </QueryClientProvider>
        </StoreProvider>
        </body>
        </html>
    );
}