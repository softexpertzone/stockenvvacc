'use client';

import VoucherForm from '@/features/accounts/components/VoucherForm';

export default function JournalVoucherPage() {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
                    Journal Voucher
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Create or edit journal entries
                </p>
            </div>

            <div className="p-6">
                <VoucherForm type="JOURNAL" />
            </div>
        </div>
    );
}