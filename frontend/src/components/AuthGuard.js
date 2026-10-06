'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/config/permissions';

const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

// 🔒 ROUTE AUTHORIZATION MATRIX
// Map URL prefixes to the permissions required to access them.
// If a path isn't listed here, it is available to any logged-in user.
const ROUTE_PERMISSIONS = {
    '/warehouse/setup': [PERMISSIONS.WAREHOUSE_SETUP],
    '/settings': [PERMISSIONS.SYSTEM_SETTINGS],
    '/catalog': [PERMISSIONS.CATALOG_MANAGE],
    '/purchase/new': [PERMISSIONS.PO_CREATE],
    '/purchase/orders': [PERMISSIONS.PO_VIEW],
    '/sales': [PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE],
};

export default function AuthGuard({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const checkAuth = () => {
            try {
                // 1. Get Authentication Data
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
                const user = userStr ? JSON.parse(userStr) : null;

                const isPublic = PUBLIC_PATHS.some((path) => pathname?.startsWith(path));

                // 2. Handle Public Routes (Login/Register)
                if (isPublic) {
                    if (token) {
                        router.replace('/dashboard');
                        return;
                    }
                    if (!cancelled) setIsReady(true);
                    return;
                }

                // 3. Handle Unauthenticated Users (No Token)
                if (!token || !user) {
                    router.replace('/auth/login');
                    return;
                }

                // 4. Handle Route Authorization (Enterprise ACL)
                let userHasAccess = true;
                const userRole = user.role;

                // Loop through our configured routes to see if the current path requires permissions
                for (const [routePrefix, requiredPerms] of Object.entries(ROUTE_PERMISSIONS)) {
                    if (pathname?.startsWith(routePrefix)) {
                        userHasAccess = hasPermission(userRole, requiredPerms);
                        break; // Stop checking once we find the matching route prefix
                    }
                }

                if (!userHasAccess) {
                    console.warn(`Security Event: ${userRole} attempted to access restricted route ${pathname}`);
                    router.replace('/dashboard'); // Kick unauthorized users back to the dashboard
                    return;
                }

                // If they pass all checks, render the page
                if (!cancelled) setIsReady(true);
            } catch (err) {
                console.error('AuthGuard error:', err);
                if (!cancelled) setIsReady(true);
            }
        };

        // Small delay avoids the synchronous setState lint error
        const timer = setTimeout(checkAuth, 0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [pathname, router]);

    if (!isReady) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900">
                <div className="text-blue-500 font-medium tracking-wide">Verifying Access Level...</div>
            </div>
        );
    }

    return children;
}