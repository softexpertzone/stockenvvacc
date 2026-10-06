// src/app/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        // Check if authentication token exists in local storage
        const token = localStorage.getItem('token');

        if (token) {
            router.replace('/dashboard');
        } else {
            router.replace('/auth/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
            <div className="text-xs font-semibold tracking-widest uppercase animate-pulse">
                Initializing Enterprise Gateway...
            </div>
        </div>
    );
}