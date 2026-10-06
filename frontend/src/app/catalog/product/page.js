'use client';

import { useProductRegistration } from '@/features/catalog/hooks/useProductRegistration';
import BrandCascadeSelector from '@/features/inventory/components/BrandCascadeSelector';

export default function UnifiedProductRegistration() {
    // 1. Hook Integration - Destructuring all necessary states and actions
    const {
        meta = {},
        form = {},
        handleFieldChange,
        updateHierarchy,
        variants = [],
        handleVariantChange,
        addVariant,
        removeVariant,
        submit,
        loading
    } = useProductRegistration();

    // 2. Helper: Attribute Matching with typo-tolerance
    const getAttributeValues = (attrName) => {
        if (!meta?.attributes || !Array.isArray(meta.attributes)) {
            return [];
        }

        const foundAttr = meta.attributes.find(a => {
            const dbName = (a?.name || a?.label || a?.title || '').toLowerCase().trim();
            const searchName = attrName.toLowerCase().trim();

            // Auto-correcting database "sige" to UI "size"
            if (searchName === 'size' && dbName === 'sige') return true;

            return dbName === searchName;
        });

        return foundAttr?.values || foundAttr?.attributeValues || foundAttr?.AttributeValue || [];
    };

    // 3. Main Render
    return (
        <div className="p-8 bg-slate-50 min-h-screen text-slate-900">
            <header className="mb-6">
                <h1 className="text-2xl font-bold">Industrial Product Registration</h1>
                <p className="text-sm text-slate-500">Define master product data, attributes, and variants.</p>
            </header>

            <form onSubmit={submit} className="max-w-6xl bg-white p-6 shadow-sm rounded border border-slate-200">

                {/* 1. Core Master Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="flex flex-col">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1">Product Name</label>
                        <input
                            className="p-2.5 border rounded-md text-sm" placeholder="e.g., Industrial Bearing"
                            value={form?.name || ''}
                            onChange={e => handleFieldChange('name', e.target.value)} required
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1">Master SKU</label>
                        <input
                            className="p-2.5 border rounded-md text-sm bg-slate-50" placeholder="e.g., BRNG-001"
                            value={form?.sku || ''}
                            onChange={e => handleFieldChange('sku', e.target.value)} required
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1">Category</label>
                        <select
                            className="p-2.5 border rounded-md text-sm"
                            value={form?.categoryId || ''}
                            onChange={e => handleFieldChange('categoryId', e.target.value)}
                        >
                            <option value="">Select Category</option>
                            {(meta?.categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1">UOM</label>
                        <select className="p-2.5 border rounded-md text-sm" onChange={e => handleFieldChange('uomId', e.target.value)}>
                            <option value="">Select UOM</option>
                            {(meta?.uoms || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1">Tax Profile</label>
                        <select className="p-2.5 border rounded-md text-sm" onChange={e => handleFieldChange('taxId', e.target.value)}>
                            <option value="">Select Tax</option>
                            {(meta?.taxes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                        <textarea
                            className="p-2.5 border rounded-md text-sm resize-y"
                            placeholder="Detailed product description..."
                            rows="3"
                            value={form?.description || ''}
                            onChange={e => handleFieldChange('description', e.target.value)}
                        />
                    </div>
                </div>

                {/* 2. Brand Cascade */}
                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <BrandCascadeSelector onSelectionChange={updateHierarchy} />
                </div>

                {/* 3. Variant Management */}
                <div className="mt-6 border-t border-slate-200 pt-6">
                    <h3 className="font-semibold mb-4 text-slate-900 text-lg">Product Variants</h3>

                    <div className="space-y-3">
                        {variants.map((v, i) => (
                            <div
                                key={i}
                                className="relative bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-sm"
                            >
                                {/* Remove button — top-right on mobile */}
                                <button
                                    type="button"
                                    onClick={() => removeVariant(i)}
                                    className="absolute top-2 right-2 z-10 text-red-500 font-bold p-1.5 rounded hover:bg-red-50 hover:text-red-700"
                                    aria-label="Remove variant"
                                >
                                    ✕
                                </button>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pr-8 sm:pr-0">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                            SKU
                                        </label>
                                        <input
                                            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#017E84]/30 focus:border-[#017E84]"
                                            placeholder="SKU"
                                            value={v?.sku || ''}
                                            onChange={e => handleVariantChange(i, 'sku', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                            Color
                                        </label>
                                        <select
                                            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84]/30 focus:border-[#017E84]"
                                            value={v?.attributes?.color || ''}
                                            onChange={e => handleVariantChange(i, 'color', e.target.value, true)}
                                        >
                                            <option value="">Color</option>
                                            {getAttributeValues('Color').map((val, idx) => (
                                                <option key={idx} value={val.value}>{val.value}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                            Size
                                        </label>
                                        <select
                                            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84]/30 focus:border-[#017E84]"
                                            value={v?.attributes?.size || ''}
                                            onChange={e => handleVariantChange(i, 'size', e.target.value, true)}
                                        >
                                            <option value="">Size</option>
                                            {getAttributeValues('Size').map((val, idx) => (
                                                <option key={idx} value={val.value}>{val.value}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                            Price
                                        </label>
                                        <input
                                            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84]/30 focus:border-[#017E84]"
                                            type="number"
                                            placeholder="Price"
                                            value={v?.price || ''}
                                            onChange={e => handleVariantChange(i, 'price', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                            Cost
                                        </label>
                                        <input
                                            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84]/30 focus:border-[#017E84]"
                                            type="number"
                                            placeholder="Cost"
                                            value={v?.purchasePrice || ''}
                                            onChange={e => handleVariantChange(i, 'purchasePrice', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                            Min Stock
                                        </label>
                                        <input
                                            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84]/30 focus:border-[#017E84]"
                                            type="number"
                                            placeholder="Min Stock"
                                            value={v?.minStockLevel || ''}
                                            onChange={e => handleVariantChange(i, 'minStockLevel', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addVariant}
                        className="mt-4 w-full sm:w-auto bg-[#017E84] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#01656A] transition-colors"
                    >
                        + Add Variant
                    </button>
                </div>

                {/* 4. Submission */}
                <div className="mt-8 border-t pt-6 text-right">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-[#017E84] text-white px-8 py-3 rounded font-bold hover:bg-[#01656A] disabled:bg-[#017E84]/60 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Processing...' : 'Complete Registration'}
                    </button>
                </div>
            </form>
        </div>
    );
}