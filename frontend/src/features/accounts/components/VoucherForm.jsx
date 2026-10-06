'use client';

import { useState, useEffect, useCallback } from 'react';
import VoucherLineItems from './VoucherLineItems';
import { voucherApi } from '../api/voucherApi';
import { useRouter } from 'next/navigation';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };

    const token =
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('jwt') ||
        sessionStorage.getItem('token');

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const getPoId = (po) => po?.id || po?._id || po?.purchaseOrderId || po?.orderId;
const getPoNumber = (po) =>
    po?.purchaseNumber || po?.poNumber || po?.orderNumber || po?.code || po?.number || getPoId(po);
const getPoDueAmount = (po) => {
    if (po?.dueAmount !== undefined) return Number(po.dueAmount || 0);
    if (po?.due !== undefined) return Number(po.due || 0);
    if (po?.balance !== undefined) return Number(po.balance || 0);
    if (po?.remainingAmount !== undefined) return Number(po.remainingAmount || 0);
    if (po?.netAmount !== undefined) return Number(po.netAmount || 0);
    if (po?.totalAmount !== undefined) return Number(po.totalAmount || 0);
    if (po?.grandTotal !== undefined) return Number(po.grandTotal || 0);
    if (po?.amount !== undefined) return Number(po.amount || 0);
    return 0;
};

const getLedgerId = (l) => l?.id || l?._id || l?.ledgerId || l?.accountId || '';
const getLedgerName = (l) =>
    (l?.name || l?.ledgerName || l?.accountName || l?.title || l?.code || '').toString();

const isAccountsPayable = (l) => {
    const n = getLedgerName(l).toLowerCase().trim();
    const code = (l?.code || l?.accountCode || '').toString().toLowerCase();
    return (
        n.includes('accounts payable') ||
        n.includes('account payable') ||
        n === 'ap' ||
        n.startsWith('ap -') ||
        n.startsWith('ap-') ||
        n.startsWith('ap ') ||
        code === 'ap' ||
        code.startsWith('ap') ||
        n.includes('sundry creditors') ||
        n.includes('trade payable') ||
        n.includes('creditors')
    );
};

const isCashOrBank = (l) => {
    const n = getLedgerName(l).toLowerCase().trim();
    const t = (l?.type || l?.accountType || l?.group || l?.category || l?.ledgerType || '')
        .toString()
        .toLowerCase();
    const code = (l?.code || l?.accountCode || '').toString().toLowerCase();
    return (
        n.includes('cash') ||
        n.includes('bank') ||
        n.includes('petty') ||
        n.startsWith('cash') ||
        code.includes('cash') ||
        code.includes('bank') ||
        t.includes('cash') ||
        t.includes('bank')
    );
};

const scoreCashPreference = (l) => {
    const n = getLedgerName(l).toLowerCase().trim();
    if (n === 'cash' || n === 'cash - cash' || n === 'cash-cash') return 100;
    if (n.startsWith('cash -') || n.startsWith('cash-')) return 95;
    if (n.startsWith('cash')) return 80;
    if (n.includes('cash in hand') || n.includes('petty cash')) return 70;
    if (n.includes('bank')) return 40;
    return 10;
};

export default function VoucherForm({ type = 'JOURNAL', initialData = null }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Toast
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4500);
    }, []);

    // Form state
    const [form, setForm] = useState({
        voucherType: type,
        voucherDate: initialData?.voucherDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        narration: initialData?.narration || '',
        partnerId: initialData?.partnerId || '',
        purchaseOrderId: initialData?.purchaseOrderId || '',
        entries: initialData?.entries || [
            { ledgerId: '', debit: 0, credit: 0, notes: '' },
            { ledgerId: '', debit: 0, credit: 0, notes: '' },
        ],
    });

    // Against-PO state
    const [paymentMode, setPaymentMode] = useState('normal');
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [openPOs, setOpenPOs] = useState([]);
    const [selectedPOId, setSelectedPOId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [loadingPOs, setLoadingPOs] = useState(false);

    // Ledgers
    const [allLedgers, setAllLedgers] = useState([]);
    const [apLedgerId, setApLedgerId] = useState('');
    const [cashBankLedgers, setCashBankLedgers] = useState([]);
    const [selectedCashBankId, setSelectedCashBankId] = useState('');
    const [loadingLedgers, setLoadingLedgers] = useState(false);

    // ========== Load ledgers ==========
    const loadLedgers = useCallback(async () => {
        await Promise.resolve();
        setLoadingLedgers(true);
        try {
            const endpoints = [
                'http://localhost:5000/api/accounts/ledgers',
                'http://localhost:5000/api/accounts/ledger',
                '/api/accounts/ledgers',
                '/api/accounts/ledger',
            ];

            const extractList = (data) => {
                if (Array.isArray(data)) return data;
                if (!data || typeof data !== 'object') return null;
                const candidates = [
                    data.data, data.items, data.records, data.ledgers,
                    data.accounts, data.rows, data.result, data.results,
                    data.list, data.payload, data.content,
                    data.data?.data, data.data?.items, data.data?.ledgers,
                ];
                for (const c of candidates) {
                    if (Array.isArray(c) && c.length > 0) return c;
                }
                return Object.values(data).find((v) => Array.isArray(v) && v.length > 0) || null;
            };

            let rawList = [];
            for (const url of endpoints) {
                try {
                    const res = await fetch(url, {
                        headers: getAuthHeaders(),
                        credentials: 'include',
                    });
                    if (!res.ok) continue;
                    const data = await res.json();
                    const list = extractList(data);
                    if (list && list.length > 0) {
                        rawList = list;
                        break;
                    }
                } catch {
                    // try next
                }
            }

            setAllLedgers(rawList);

            const ap = rawList.find(isAccountsPayable);
            if (ap) setApLedgerId(getLedgerId(ap));

            const cashBank = rawList
                .filter(isCashOrBank)
                .sort((a, b) => scoreCashPreference(b) - scoreCashPreference(a));

            setCashBankLedgers(cashBank.length > 0 ? cashBank : rawList);

            if (cashBank.length > 0) {
                setSelectedCashBankId((prev) => prev || getLedgerId(cashBank[0]));
            }
        } catch (err) {
            console.error('Failed to load ledgers', err);
        } finally {
            setLoadingLedgers(false);
        }
    }, []);

    // ========== Load Open POs ==========
    const loadOpenPOs = useCallback(
        async (supplierId) => {
            if (!supplierId) {
                setOpenPOs([]);
                return;
            }
            setLoadingPOs(true);
            try {
                const res = await fetch(
                    `http://localhost:5000/api/purchase/orders?partnerId=${supplierId}&supplierId=${supplierId}`,
                    {
                        headers: getAuthHeaders(),
                        credentials: 'include',
                    }
                );

                const responseData = await res.json();

                if (!res.ok) {
                    console.error('PO endpoint returned error:', responseData);
                    showToast(responseData.message || 'Failed to load Purchase Orders', 'error');
                    return;
                }

                let rawList = [];
                if (Array.isArray(responseData)) {
                    rawList = responseData;
                } else if (responseData && typeof responseData === 'object') {
                    const potentialArray =
                        responseData.data ||
                        responseData.items ||
                        responseData.records ||
                        responseData.orders ||
                        responseData.rows;
                    rawList = Array.isArray(potentialArray) ? potentialArray : [];
                }

                const openList = rawList.filter((po) => getPoDueAmount(po) > 0);
                setOpenPOs(openList.length > 0 ? openList : rawList);
            } catch (err) {
                console.error('Failed to load POs', err);
                showToast('Failed to load Purchase Orders', 'error');
            } finally {
                setLoadingPOs(false);
            }
        },
        [showToast]
    );

    // Load suppliers + ledgers
    useEffect(() => {
        if (type !== 'PAYMENT' || paymentMode !== 'against_po') return;

        let isMounted = true;

        const init = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/partners', {
                    headers: getAuthHeaders(),
                    credentials: 'include',
                });
                const data = await res.json();
                const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
                const list = rawList.filter(
                    (p) => p.type === 'SUPPLIER' || p.type === 'VENDOR' || !p.type
                );
                if (isMounted) setSuppliers(list);
            } catch (err) {
                console.error('Failed to load suppliers', err);
                if (isMounted) showToast('Failed to load suppliers', 'error');
            }

            if (isMounted) await loadLedgers();
        };

        init();
        return () => { isMounted = false; };
    }, [paymentMode, type, loadLedgers, showToast]);

    const handleSupplierChange = (e) => {
        const id = e.target.value;
        setSelectedSupplierId(id);
        setSelectedPOId('');
        setPaymentAmount('');
        loadOpenPOs(id);
    };

    const handlePOChange = (e) => {
        const id = e.target.value;
        setSelectedPOId(id);
        setPaymentMode('against_po');

        const po = openPOs.find((p) => String(getPoId(p)) === String(id));
        if (!po) return;

        const due = getPoDueAmount(po);
        setPaymentAmount(due > 0 ? due.toString() : '');

        // Auto fill form
        const amount = due;
        const poNum = getPoNumber(po);
        const debitLedgerId = apLedgerId;
        const creditLedgerId =
            selectedCashBankId ||
            (cashBankLedgers.length > 0 ? getLedgerId(cashBankLedgers[0]) : '');

        setForm((prev) => ({
            ...prev,
            partnerId: selectedSupplierId,
            purchaseOrderId: getPoId(po),
            narration: `Payment against ${poNum} | Total Due was ${due.toLocaleString()}`,
            entries: [
                {
                    ledgerId: debitLedgerId,
                    debit: amount,
                    credit: 0,
                    notes: `Payment against ${poNum}`,
                },
                {
                    ledgerId: creditLedgerId,
                    debit: 0,
                    credit: amount,
                    notes: 'Cash / Bank Account',
                },
            ],
        }));
    };

    const applyPOPaymentToForm = () => {
        if (!selectedPOId || !paymentAmount || Number(paymentAmount) <= 0) {
            showToast('Please select a Purchase Order and enter a valid amount', 'error');
            return;
        }

        const po = openPOs.find((p) => String(getPoId(p)) === String(selectedPOId));
        if (!po) return;

        const amount = Number(paymentAmount);
        const poNum = getPoNumber(po);
        const due = getPoDueAmount(po);

        const debitLedgerId = apLedgerId;
        const creditLedgerId =
            selectedCashBankId ||
            (cashBankLedgers.length > 0 ? getLedgerId(cashBankLedgers[0]) : '');

        setForm((prev) => ({
            ...prev,
            partnerId: selectedSupplierId,
            purchaseOrderId: getPoId(po),
            narration: `Payment against ${poNum} | Total Due was ${due.toLocaleString()}`,
            entries: [
                {
                    ledgerId: debitLedgerId,
                    debit: amount,
                    credit: 0,
                    notes: `Payment against ${poNum}`,
                },
                {
                    ledgerId: creditLedgerId,
                    debit: 0,
                    credit: amount,
                    notes: 'Cash / Bank Account',
                },
            ],
        }));

        showToast('Entries filled successfully', 'success');
    };

    const validateForm = () => {
        if (!form.voucherDate) {
            showToast('Please select voucher date', 'error');
            return false;
        }
        if (!form.entries || form.entries.length < 2) {
            showToast('Voucher must have at least 2 entries', 'error');
            return false;
        }

        const emptyAccount = form.entries.findIndex((e) => !e.ledgerId);
        if (emptyAccount !== -1) {
            showToast(`Please select Account for line #${emptyAccount + 1}`, 'error');
            return false;
        }

        const emptyAmount = form.entries.findIndex((e) => {
            const d = Number(e.debit || 0);
            const c = Number(e.credit || 0);
            return d === 0 && c === 0;
        });
        if (emptyAmount !== -1) {
            showToast(`Line #${emptyAmount + 1} must have either Debit or Credit amount`, 'error');
            return false;
        }

        const bothSides = form.entries.findIndex((e) => {
            const d = Number(e.debit || 0);
            const c = Number(e.credit || 0);
            return d > 0 && c > 0;
        });
        if (bothSides !== -1) {
            showToast(`Line #${bothSides + 1} cannot have both Debit and Credit`, 'error');
            return false;
        }

        const totalDebit = form.entries.reduce((s, e) => s + Number(e.debit || 0), 0);
        const totalCredit = form.entries.reduce((s, e) => s + Number(e.credit || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            showToast(
                `Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`,
                'error'
            );
            return false;
        }

        // ✅ NEW: Payment Amount must match Debit / Credit totals (Against PO mode)
        if (type === 'PAYMENT' && paymentMode === 'against_po' && paymentAmount) {
            const payAmt = Number(paymentAmount || 0);

            if (payAmt <= 0) {
                showToast('Payment Amount must be greater than 0', 'error');
                return false;
            }

            if (Math.abs(payAmt - totalDebit) > 0.01) {
                showToast(
                    `Payment Amount (${payAmt.toFixed(2)}) must equal Total Debit (${totalDebit.toFixed(2)})`,
                    'error'
                );
                return false;
            }

            if (Math.abs(payAmt - totalCredit) > 0.01) {
                showToast(
                    `Payment Amount (${payAmt.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`,
                    'error'
                );
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            // Force Against-PO values if a PO was selected
            const isAgainstPO = paymentMode === 'against_po' || !!selectedPOId;

            const finalPartnerId = selectedSupplierId || form.partnerId || null;
            const finalPurchaseOrderId = selectedPOId || form.purchaseOrderId || null;

            if (isAgainstPO && !finalPurchaseOrderId) {
                showToast('Please select a Purchase Order first', 'error');
                setLoading(false);
                return;
            }

            const payload = {
                voucherType: form.voucherType || type,
                voucherDate: form.voucherDate,
                narration: form.narration,
                financialYear: '2025-26',
                status: 'DRAFT',
                entries: form.entries,

                // Always send these when a PO was selected
                partnerId: finalPartnerId,
                purchaseOrderId: finalPurchaseOrderId,
            };

            console.log('>>> FINAL PAYLOAD BEING SENT:', payload);

            if (initialData?.id) {
                await voucherApi.update(initialData.id, payload);
                showToast('Voucher updated successfully', 'success');
            } else {
                await voucherApi.create(payload);
                showToast('Voucher saved successfully', 'success');
            }

            // Refresh open POs
            if (selectedSupplierId) {
                await loadOpenPOs(selectedSupplierId);
            }

            setTimeout(() => router.push('/accounts/vouchers'), 800);
        } catch (err) {
            const message =
                err.response?.data?.message ||
                err.response?.data?.errors?.[0]?.message ||
                err.message ||
                'Failed to save voucher';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Toast styles
    const toastStyles = {
        success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        error: 'bg-red-50 border-red-300 text-red-800',
        info: 'bg-blue-50 border-blue-300 text-blue-800',
    };
    const toastIcons = { success: '✅', error: '❌', info: 'ℹ️' };

    return (
        <form onSubmit={handleSubmit} className="max-w-5xl space-y-6 relative">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 max-w-sm w-full shadow-lg rounded-lg border px-4 py-3 flex items-start gap-3 ${toastStyles[toast.type] || toastStyles.info}`}
                    role="alert"
                >
                    <span className="text-lg leading-none mt-0.5">
                        {toastIcons[toast.type] || 'ℹ️'}
                    </span>
                    <p className="text-sm font-medium flex-1">{toast.message}</p>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        className="text-current opacity-60 hover:opacity-100 text-lg leading-none"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Payment Mode */}
            {type === 'PAYMENT' && (
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-blue-100 bg-blue-50">
                        <h2 className="text-sm font-medium text-blue-800 uppercase tracking-wide">
                            Payment Mode
                        </h2>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="paymentMode"
                                    value="normal"
                                    checked={paymentMode === 'normal'}
                                    onChange={() => setPaymentMode('normal')}
                                />
                                <span className="text-sm">Normal Payment</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="paymentMode"
                                    value="against_po"
                                    checked={paymentMode === 'against_po'}
                                    onChange={() => setPaymentMode('against_po')}
                                />
                                <span className="text-sm font-medium text-blue-700">
                                    Against Purchase Order
                                </span>
                            </label>
                        </div>

                        {paymentMode === 'against_po' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                {/* Supplier */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        Supplier
                                    </label>
                                    <select
                                        value={selectedSupplierId}
                                        onChange={handleSupplierChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id || s._id} value={s.id || s._id}>
                                                {s.name || s.companyName || s.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Open PO */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        Open Purchase Order (Due)
                                    </label>
                                    <select
                                        value={selectedPOId}
                                        onChange={handlePOChange}
                                        disabled={!selectedSupplierId || loadingPOs}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="">
                                            {loadingPOs ? 'Loading...' : 'Select PO'}
                                        </option>
                                        {openPOs.map((po, index) => {
                                            const poId = getPoId(po) || index;
                                            const poNum = getPoNumber(po);
                                            const dueAmt = getPoDueAmount(po);
                                            return (
                                                <option key={poId} value={poId}>
                                                    {poNum} — Due: {dueAmt.toLocaleString()}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        Payment Amount
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* Pay From */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        Pay From (Cash / Bank Account)
                                    </label>
                                    <select
                                        value={selectedCashBankId}
                                        onChange={(e) => setSelectedCashBankId(e.target.value)}
                                        disabled={loadingLedgers}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="">
                                            {loadingLedgers ? 'Loading accounts...' : 'Select Cash / Bank Account'}
                                        </option>
                                        {cashBankLedgers.map((l) => {
                                            const id = getLedgerId(l);
                                            const name = getLedgerName(l) || id;
                                            return (
                                                <option key={id} value={id}>
                                                    {name}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Apply Button */}
                                <div className="md:col-span-2">
                                    <button
                                        type="button"
                                        onClick={applyPOPaymentToForm}
                                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm"
                                    >
                                        Apply to Voucher Entries
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Voucher Details */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                        Voucher Details
                    </h2>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Voucher Type
                            </label>
                            <input
                                type="text"
                                value={form.voucherType}
                                disabled
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.voucherDate}
                                onChange={(e) => setForm({ ...form, voucherDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                required
                            />
                        </div>
                    </div>
                    <div className="mt-5">
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            Narration
                        </label>
                        <textarea
                            value={form.narration}
                            onChange={(e) => setForm({ ...form, narration: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            rows={2}
                            placeholder="Enter narration / description..."
                        />
                    </div>
                </div>
            </div>

            {/* Journal Entries */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                        Journal Entries
                    </h2>
                </div>
                <div className="p-5">
                    <VoucherLineItems
                        entries={form.entries}
                        onChange={(entries) => setForm({ ...form, entries })}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-60"
                >
                    {loading ? 'Saving...' : initialData ? 'Update Voucher' : 'Save as Draft'}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center px-6 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}