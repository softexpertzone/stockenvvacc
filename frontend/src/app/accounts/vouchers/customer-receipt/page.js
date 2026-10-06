'use client';

import CustomerReceiptForm from '@/features/accounts/components/CustomerReceiptForm';
import Link from 'next/link';

export default function CustomerReceiptPage() {
    return (
        <div className="p-6 max-w-2xl">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Customer Receipt
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Record full or partial payment against a sales invoice
                        (Accounts module)
                    </p>
                </div>
                <Link
                    href="/accounts/vouchers/receipt"
                    className="text-sm text-[#017E84] hover:underline"
                >
                    ← Receipt Voucher
                </Link>
            </div>

            <CustomerReceiptForm />
        </div>
    );
}