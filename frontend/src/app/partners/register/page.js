'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';

export default function PartnerRegistrationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [registeredPartner, setRegisteredPartner] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    const [formData, setFormData] = useState({
        type: 'VENDOR',
        companyName: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        creditLimit: 0,
        bankName: '',
        accountNo: '',
        ifscCode: '',
        taxId: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            type: 'VENDOR',
            companyName: '',
            name: '',
            phone: '',
            email: '',
            address: '',
            creditLimit: 0,
            bankName: '',
            accountNo: '',
            ifscCode: '',
            taxId: ''
        });
        setIsSuccess(false);
        setRegisteredPartner(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/partners`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: formData.type,
                    companyName: formData.companyName,
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                    creditLimit: parseFloat(formData.creditLimit) || 0,
                    taxId: formData.taxId,
                    bankName: formData.bankName,
                    accountNo: formData.accountNo,
                    ifscCode: formData.ifscCode
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Registration failed");
            }

            // Success
            setRegisteredPartner(result.data);
            setIsSuccess(true);
            setToast({
                message: `${formData.type === 'VENDOR' ? 'Supplier' : 'Buyer'} registered successfully!`,
                type: 'success'
            });

        } catch (error) {
            setToast({
                message: error.message || 'Something went wrong',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    // ====================== SUCCESS VIEW ======================
    if (isSuccess && registeredPartner) {
        return (
            <div className="max-w-3xl mx-auto p-6 bg-slate-50 min-h-screen">
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ message: '', type: 'success' })}
                />

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
                    {/* Success Icon */}
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Registration Successful
                    </h2>
                    <p className="text-slate-600 mb-8">
                        The partner has been created and is now available in the system.
                    </p>

                    {/* Summary Card */}
                    <div className="bg-slate-50 rounded-xl p-6 text-left mb-8 border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-slate-500">Company</p>
                                <p className="font-semibold text-slate-900">{registeredPartner.companyName}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Type</p>
                                <p className="font-semibold text-slate-900">{registeredPartner.type}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Contact Person</p>
                                <p className="font-semibold text-slate-900">{registeredPartner.name}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Phone</p>
                                <p className="font-semibold text-slate-900">{registeredPartner.phone}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={resetForm}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                        >
                            Register Another Partner
                        </button>
                        <button
                            onClick={() => router.push('/partners/directory')}
                            className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                        >
                            View Partner Directory
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ====================== REGISTRATION FORM ======================
    return (
        <div className="max-w-3xl mx-auto p-6 bg-slate-50 min-h-screen">
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            <h1 className="text-2xl font-bold mb-6 text-slate-900">Partner Management</h1>

            <div className="mb-6">
                <label className="block text-sm font-bold mb-2 text-slate-700">Select Registration Type</label>
                <select
                    name="type"
                    className="w-full border-2 border-slate-300 p-3 rounded-lg bg-white text-slate-900 font-medium"
                    value={formData.type}
                    onChange={handleInputChange}
                >
                    <option value="VENDOR">Supplier (Vendor)</option>
                    <option value="BUYER">Buyer</option>
                </select>
            </div>

            <form onSubmit={handleSubmit} className="p-8 bg-white shadow-md border border-slate-200 rounded-xl space-y-6">
                <h3 className="font-bold text-xl text-slate-900 uppercase border-b pb-4">
                    New {formData.type} Registration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required name="companyName" className="border border-slate-400 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="Company Name"
                           value={formData.companyName} onChange={handleInputChange} />
                    <input required name="name" className="border border-slate-400 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="Contact Name"
                           value={formData.name} onChange={handleInputChange} />
                    <input required name="phone" className="border border-slate-400 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="Phone Number"
                           value={formData.phone} onChange={handleInputChange} />
                    <input name="email" className="border border-slate-400 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="Email Address" type="email"
                           value={formData.email} onChange={handleInputChange} />
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase">Financial & Tax Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="taxId" className="border border-slate-300 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="Tax ID / GSTIN"
                               value={formData.taxId} onChange={handleInputChange} />
                        <input name="creditLimit" className="border border-slate-300 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="Credit Limit" type="number"
                               value={formData.creditLimit} onChange={handleInputChange} />
                        <input name="bankName" className="border border-slate-300 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="Bank Name"
                               value={formData.bankName} onChange={handleInputChange} />
                        <input name="accountNo" className="border border-slate-300 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="Account Number"
                               value={formData.accountNo} onChange={handleInputChange} />
                        <input name="ifscCode" className="border border-slate-300 p-3 rounded-lg w-full text-slate-900 placeholder-slate-500" placeholder="IFSC Code"
                               value={formData.ifscCode} onChange={handleInputChange} />
                    </div>
                    <textarea name="address" className="w-full border border-slate-300 p-3 rounded-lg text-slate-900 placeholder-slate-500" placeholder="Business Address"
                              value={formData.address} onChange={handleInputChange} />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg disabled:opacity-60"
                >
                    {loading ? 'Processing...' : `Register ${formData.type}`}
                </button>
            </form>
        </div>
    );
}