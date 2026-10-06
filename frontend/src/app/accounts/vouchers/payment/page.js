'use client';
import VoucherForm from '@/features/accounts/components/VoucherForm';

export default function PaymentVoucherPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-6">Payment Voucher</h1>
            <VoucherForm type="PAYMENT" />
        </div>
    );
}