'use client';

import Image from 'next/image';
import { useSelector } from 'react-redux';

export default function TopHeader() {
    // Fetch the user's name dynamically from your global store.
    const user = useSelector((state) => state.auth?.user);
    const userName = user?.name || user?.username || '';

    return (
        <header className="shrink-0 h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6 shadow-md">

            {/* Fancy Light Gold User Name (Dynamic) */}
            <div className="flex items-center">
                <span
                    className="text-[#F0D572] text-2xl antialiased capitalize"
                    style={{ fontFamily: "'Brush Script MT', 'Playfair Display', cursive, serif" }}
                >
                    {userName}
                </span>
            </div>

            {/* Logo */}
            <Image
                src="/img/logo.png"
                alt="STOCKINVENTORY"
                width={150}
                height={28}
                className="h-8 w-auto object-contain"
                priority
            />
        </header>
    );
}