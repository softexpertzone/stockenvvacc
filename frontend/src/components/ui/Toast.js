'use client';
import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => {
            onClose?.();
        }, duration);
        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    if (!message) return null;

    const styles = {
        success: 'bg-green-50 border-green-400 text-green-800',
        error: 'bg-red-50 border-red-400 text-red-800',
        warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
        info: 'bg-blue-50 border-blue-400 text-blue-800',
    };

    return (
        <div className={`fixed top-6 right-6 z-50 max-w-sm w-full border-l-4 p-4 rounded-lg shadow-lg ${styles[type]}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <p className="font-medium text-sm">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="text-xl leading-none opacity-60 hover:opacity-100"
                >
                    ×
                </button>
            </div>
        </div>
    );
}