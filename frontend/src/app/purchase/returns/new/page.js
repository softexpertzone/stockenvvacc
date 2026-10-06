'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Package,
    FileText,
    AlertCircle,
    ChevronRight,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

import VendorSelector from '@/features/purchase/components/VendorSelector';
import ProductPicker from '@/features/sales/components/ProductPicker';
import LocationCascadeSelector from '@/features/inventory/components/LocationCascadeSelector';
import BatchSelector from '@/features/inventory/components/BatchSelector';

export default function NewReturnPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [grns, setGrns] = useState([]);
    const [loadingRefs, setLoadingRefs] = useState(false);
    const [selectedPoItems, setSelectedPoItems] = useState([]);
    const [poGrnData, setPoGrnData] = useState([]);

    const [form, setForm] = useState({
        partnerId: '',
        purchaseOrderId: '',
        grnId: '',
        notes: '',
        items: [
            {
                id: crypto.randomUUID(),
                productVariantId: '',
                productName: '',
                binId: '',
                godownId: '',
                roomId: '',
                rackId: '',
                batchId: '',
                quantityCount: 1,
                quantityKg: 0,
                reasonId: '',
                unitCost: '',
                notes: '',
            },
        ],
    });

    const loadVendorDocuments = async (partnerId) => {
        if (!partnerId) {
            setPurchaseOrders([]);
            setGrns([]);
            return;
        }

        try {
            setLoadingRefs(true);

            const [poRes, grnRes] = await Promise.all([
                apiClient.get(`/api/purchase/orders?partnerId=${partnerId}`),
                apiClient.get(`/api/inventory/grn?partnerId=${partnerId}`),
            ]);

            setPurchaseOrders(poRes.data?.data || []);
            setGrns(grnRes.data?.data || []);
        } catch (err) {
            console.error('Failed to load vendor documents:', err);
            setPurchaseOrders([]);
            setGrns([]);
        } finally {
            setLoadingRefs(false);
        }
    };

    const addLine = () => {
        setForm((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: crypto.randomUUID(),
                    productVariantId: '',
                    productName: '',
                    binId: '',
                    batchId: '',
                    quantityCount: 1,
                    quantityKg: 0,
                    reasonId: 'damaged',
                    unitCost: '',
                    notes: '',
                },
            ],
        }));
    };

    const removeLine = (id) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((item) => item.id !== id),
        }));
    };

    const updateLine = (id, fieldOrObject, value) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item) => {
                if (item.id !== id) return item;
                if (typeof fieldOrObject === 'object' && fieldOrObject !== null) {
                    return { ...item, ...fieldOrObject };
                }
                return { ...item, [fieldOrObject]: value };
            }),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Basic required checks
            if (!form.partnerId) throw new Error('Please select a Vendor');
            if (!form.purchaseOrderId) throw new Error('Please select a Purchase Order');

            // Group return quantities by productVariantId (in case same product appears on multiple lines)
            const returnQtyByVariant = {};

            for (const [index, item] of form.items.entries()) {
                if (!item.productVariantId) {
                    throw new Error(`Line ${index + 1}: Product is required`);
                }
                if (!item.binId) {
                    throw new Error(`Line ${index + 1}: Storage location (Bin) is required`);
                }
                if (!item.reasonId) {
                    throw new Error(`Line ${index + 1}: Return Reason is required`);
                }

                const qty = Number(item.quantityCount) || 0;
                if (qty <= 0) {
                    throw new Error(`Line ${index + 1}: Quantity must be greater than 0`);
                }

                // Product must belong to selected PO
                const poItem = selectedPoItems.find(
                    (p) => p.productVariantId === item.productVariantId
                );
                if (!poItem) {
                    throw new Error(
                        `Line ${index + 1}: Product "${item.productName}" does not belong to the selected Purchase Order`
                    );
                }

                // Accumulate return qty for this variant
                returnQtyByVariant[item.productVariantId] =
                    (returnQtyByVariant[item.productVariantId] || 0) + qty;
            }

            // 2. Check total return qty does not exceed PO ordered qty
            for (const [variantId, totalReturnQty] of Object.entries(returnQtyByVariant)) {
                const poItem = selectedPoItems.find((p) => p.productVariantId === variantId);
                const orderedQty = Number(poItem?.quantityCount) || 0;

                if (totalReturnQty > orderedQty) {
                    const name =
                        form.items.find((i) => i.productVariantId === variantId)?.productName ||
                        variantId;
                    throw new Error(
                        `Cannot return ${totalReturnQty} of "${name}". ` +
                        `Only ${orderedQty} was ordered on this Purchase Order.`
                    );
                }
            }

            // Optional: also check against GRN received qty (stricter)


            for (const [variantId, totalReturnQty] of Object.entries(returnQtyByVariant)) {
                let receivedQty = 0;
                for (const grn of poGrnData || []) {
                    for (const gi of grn.items || []) {
                        if (gi.productVariantId === variantId || gi.productVariant?.id === variantId) {
                            receivedQty += Number(gi.quantityCount) || 0;
                        }
                    }
                }
                if (receivedQty > 0 && totalReturnQty > receivedQty) {
                    const name =
                        form.items.find((i) => i.productVariantId === variantId)?.productName ||
                        variantId;
                    throw new Error(
                        `Cannot return ${totalReturnQty} of "${name}". ` +
                        `Only ${receivedQty} was received on the related GRN(s).`
                    );
                }
            }


            // 3. Build payload and submit
            const payload = {
                partnerId: form.partnerId,
                purchaseOrderId: form.purchaseOrderId || null,
                grnId: form.grnId || null,
                notes: form.notes || null,
                items: form.items.map(({ id, productName, godownId, roomId, rackId, ...item }) => ({
                    ...item,
                    quantityCount: Number(item.quantityCount),
                    quantityKg: Number(item.quantityKg) || 0,
                    unitCost: item.unitCost ? Number(item.unitCost) : null,
                })),
            };

            const res = await apiClient.post('/api/returns/purchase', payload);

            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Failed to create Purchase Return');
            }

            router.push('/purchase/returns');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/purchase/returns"
                            className="p-1.5 hover:bg-slate-100 rounded border border-slate-200 transition"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-600" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    RMA / Return
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                                    Draft
                                </span>
                            </div>
                            <h1 className="text-lg font-bold text-slate-900">New Goods Return</h1>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1 text-xs font-medium">
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-l font-semibold">1. Draft</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 -mx-1" />
                        <span className="px-3 py-1 bg-slate-100 text-slate-500">2. Validated</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 -mx-1" />
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-r">3. Completed</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/purchase/returns"
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50"
                        >
                            Discard
                        </Link>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded hover:bg-blue-800 disabled:opacity-60 shadow-sm"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {loading ? 'Validating...' : 'Confirm & Validate'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Header Information */}
                <div className="bg-white border border-slate-300 rounded-lg shadow-sm p-6 space-y-6">
                    <div className="border-b border-slate-200 pb-3">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Header Information
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                        {/* Vendor */}
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Partner / Vendor <span className="text-red-500">*</span>
                            </label>
                            <VendorSelector
                                value={form.partnerId}
                                onChange={(value) => {
                                    setForm({
                                        ...form,
                                        partnerId: value,
                                        purchaseOrderId: '',
                                        grnId: '',
                                    });
                                    loadVendorDocuments(value);
                                }}
                            />
                        </div>

                        {/* Purchase Order Dropdown */}
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Purchase Order Reference
                            </label>
                            <select
                                className="w-full h-9 px-3 border border-slate-300 rounded text-xs bg-white focus:ring-2 focus:ring-blue-500"
                                value={form.purchaseOrderId || ''}
                                onChange={async (e) => {
                                    const poId = e.target.value;
                                    setForm(prev => ({ ...prev, purchaseOrderId: poId, grnId: '' }));

                                    if (!poId) {
                                        setSelectedPoItems([]);
                                        setPoGrnData([]);
                                        return;
                                    }

                                    try {
                                        const selectedPo = purchaseOrders.find(p => p.id === poId);
                                        if (selectedPo) {
                                            setSelectedPoItems(selectedPo.items || []);
                                            setPoGrnData(selectedPo.grns || []);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                                disabled={!form.partnerId || loadingRefs}
                            >
                                <option value="">
                                    {!form.partnerId
                                        ? 'Select vendor first'
                                        : loadingRefs
                                            ? 'Loading...'
                                            : '-- Select Purchase Order --'}
                                </option>
                                {purchaseOrders.map((po) => (
                                    <option key={po.id} value={po.id}>
                                        {po.purchaseNumber || po.id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* GRN Dropdown */}
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                GRN Reference
                            </label>
                            <select
                                className="w-full h-9 px-3 border border-slate-300 rounded text-xs bg-white focus:ring-2 focus:ring-blue-500"
                                value={form.grnId || ''}
                                onChange={(e) => setForm({ ...form, grnId: e.target.value })}
                                disabled={!form.partnerId || loadingRefs}
                            >
                                <option value="">
                                    {!form.partnerId
                                        ? 'Select vendor first'
                                        : loadingRefs
                                            ? 'Loading...'
                                            : '-- Select GRN --'}
                                </option>
                                {grns.map((grn) => (
                                    <option key={grn.id} value={grn.id}>
                                        {grn.grnNumber}
                                        {grn.purchaseOrder?.purchaseNumber
                                            ? ` (${grn.purchaseOrder.purchaseNumber})`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-3">
                            <label className="block font-bold text-slate-700 mb-1">
                                Return Reason & Internal Notes
                            </label>
                            <textarea
                                rows={2}
                                className="w-full p-2.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                                placeholder="Add notes or quality audit observations..."
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Return Lines */}
                <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            Return Order Lines
                        </h2>
                        <button
                            type="button"
                            onClick={addLine}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-bold hover:bg-slate-100 transition shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5 text-blue-600" />
                            Add Line
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="p-3 w-1/4">Product Variant</th>
                                <th className="p-3 w-1/3">Storage Location</th>
                                <th className="p-3 w-28">Batch / Lot</th>
                                <th className="p-3 w-20 text-center">Qty</th>
                                <th className="p-3 w-36">Return Reason</th>
                                <th className="p-3 w-24 text-right">Unit Cost ($)</th>
                                <th className="p-3 w-10 text-center"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                            {form.items.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/40 transition">
                                    <td className="p-2 align-top">
                                        <ProductPicker
                                            value={item.productName ? { name: item.productName } : null}
                                            onChange={(product) => {
                                                const variantId =
                                                    product?.variantId ||
                                                    product?.productVariants?.[0]?.id ||
                                                    product?.id ||
                                                    '';

                                                const productName =
                                                    product?.name ||
                                                    product?.productName ||
                                                    product?.sku ||
                                                    'Unnamed product';

                                                console.log('=== DEBUG AUTO FILL ===');
                                                console.log('Selected Variant ID:', variantId);
                                                console.log('poGrnData:', poGrnData);
                                                console.log('selectedPoItems:', selectedPoItems);

                                                // ---- AUTO FILL LOCATION FROM GRN ----
                                                let autoBinId = '';
                                                let autoGodownId = '';
                                                let autoBatchId = '';

                                                for (const grn of poGrnData || []) {
                                                    const matchedItem = (grn.items || []).find(
                                                        (i) =>
                                                            i.productVariantId === variantId ||
                                                            i.productVariant?.id === variantId
                                                    );

                                                    if (matchedItem) {
                                                        autoBinId = matchedItem.binId || matchedItem.bin?.id || '';
                                                        autoGodownId = matchedItem.bin?.godownId || matchedItem.godownId || '';
                                                        // roomId / rackId not present in GRN response yet
                                                        console.log('Matched GRN Item:', matchedItem);
                                                        console.log('Auto Bin ID:', autoBinId, 'Auto Godown ID:', autoGodownId);
                                                        break;
                                                    }
                                                }

                                                updateLine(item.id, {
                                                    productVariantId: variantId,
                                                    productName: productName,
                                                    binId: autoBinId,
                                                    godownId: autoGodownId,
                                                    roomId: '',
                                                    rackId: '',
                                                    batchId: autoBatchId,
                                                });
                                            }}
                                        />
                                    </td>

                                    <td className="p-2 align-top">
                                        <LocationCascadeSelector
                                            selectedGodownId={item.godownId || ''}
                                            selectedRoomId={item.roomId || ''}
                                            selectedRackId={item.rackId || ''}
                                            selectedBinId={item.binId || ''}
                                            onGodownSelect={(godownId) => updateLine(item.id, 'godownId', godownId)}
                                            onRoomSelect={(roomId) => updateLine(item.id, 'roomId', roomId)}
                                            onRackSelect={(rackId) => updateLine(item.id, 'rackId', rackId)}
                                            onBinSelect={(binId) => updateLine(item.id, 'binId', binId)}
                                            onLocationSelect={(loc) => {
                                                updateLine(item.id, {
                                                    godownId: loc.godownId || '',
                                                    roomId: loc.roomId || '',
                                                    rackId: loc.rackId || '',
                                                    binId: loc.binId || '',
                                                });
                                            }}
                                        />
                                    </td>

                                    <td className="p-2 align-top">
                                        <BatchSelector
                                            productVariantId={item.productVariantId}
                                            binId={item.binId}
                                            value={item.batchId}
                                            onChange={(batchId) => updateLine(item.id, 'batchId', batchId)}
                                        />
                                    </td>

                                    <td className="p-2 align-top">
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            className="w-full h-9 px-2 text-center border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 bg-white"
                                            value={item.quantityCount}
                                            onChange={(e) =>
                                                updateLine(item.id, 'quantityCount', e.target.value)
                                            }
                                        />
                                    </td>

                                    <td className="p-2 align-top">
                                        <select
                                            required
                                            className="w-full h-9 px-2 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500"
                                            value={item.reasonId}
                                            onChange={(e) => updateLine(item.id, 'reasonId', e.target.value)}
                                        >
                                            <option value="">-- Select Reason --</option>
                                            <option value="damaged">Damaged on Arrival</option>
                                            <option value="quality">Quality Rejection</option>
                                            <option value="expired">Expired Stock</option>
                                            <option value="wrong">Wrong Item Shipped</option>
                                            <option value="excess">Excess Quantity</option>
                                        </select>
                                    </td>

                                    <td className="p-2 align-top">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full h-9 px-2 text-right border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                                            placeholder="0.00"
                                            value={item.unitCost}
                                            onChange={(e) => updateLine(item.id, 'unitCost', e.target.value)}
                                        />
                                    </td>

                                    <td className="p-2 text-center align-middle">
                                        {form.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeLine(item.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}