'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetcher';
import Toast from '@/components/ui/Toast';

export default function BrandManagementPage() {
    const [brands, setBrands] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        parentId: '',
        slug: '',
        code: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // Fetch brands on mount
    useEffect(() => {
        const fetchBrands = async () => {
            setLoading(true);
            try {
                const res = await apiFetch('/api/brands');
                const data = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
                setBrands(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Fetch Brands Error:", err);
                setBrands([]);
                setToast({ message: 'Failed to load brands', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchBrands();
    }, []);

    const handleNameChange = (e) => {
        const name = e.target.value;
        const slug = name.toLowerCase().trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');

        const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

        setFormData(prev => ({ ...prev, name, slug, code }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.name?.trim()) {
            setToast({ message: 'Brand name is required', type: 'error' });
            return;
        }
        if (!formData.code?.trim()) {
            setToast({ message: 'Brand code (e.g., BOSCH) is required', type: 'error' });
            return;
        }

        const payload = {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            slug: formData.slug?.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
            parentId: (formData.parentId && formData.parentId !== "") ? formData.parentId : null,
            description: formData.description || null
        };

        setSaving(true);
        try {
            const res = await apiFetch('/api/brands', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (res.status === 201 || res.status === 200) {
                setToast({ message: 'Brand registered successfully', type: 'success' });

                setFormData({
                    name: '',
                    code: '',
                    slug: '',
                    parentId: '',
                    description: ''
                });

                const refresh = await apiFetch('/api/brands');
                setBrands(refresh?.data?.data || refresh?.data || []);
            } else {
                setToast({
                    message: res?.error || res?.message || 'Failed to save brand',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error("Save Error:", err);
            setToast({ message: 'Request failed. Please check your network connection.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const buildHierarchy = () => {
        if (!Array.isArray(brands)) return [];
        const brandMap = new Map(brands.map(b => [String(b.id), { ...b, children: [] }]));
        const roots = [];

        brands.forEach(brand => {
            const b = brandMap.get(String(brand.id));
            if (!b.parentId) {
                roots.push(b);
            } else {
                const parent = brandMap.get(String(b.parentId));
                if (parent) {
                    parent.children.push(b);
                } else {
                    roots.push(b);
                }
            }
        });
        return roots;
    };

    const hierarchicalBrands = buildHierarchy();

    return (
        <div className="min-h-screen bg-[#f9fafb] p-4 md:p-8 text-[#374151]">

            {/* Soft Toast */}
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            <div className="max-w-7xl mx-auto flex flex-col h-full gap-6">

                {/* HEADER */}
                <div>
                    <h2 className="text-2xl font-bold text-[#374151] tracking-tight uppercase">Brand Management</h2>
                    <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider text-[11px] font-semibold">
                        Configure master brands and product lines
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* FORM CARD */}
                    <div className="w-full lg:w-1/3 bg-white rounded-sm border border-gray-200 shadow-sm relative flex-shrink-0">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] rounded-t-sm"></div>
                        <div className="p-4 md:p-6">
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-5">Register New Brand</h2>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Parent Master Brand
                                    </label>
                                    <select
                                        value={formData.parentId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm outline-none bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                    >
                                        <option value="">— Master Brand (No Parent) —</option>
                                        {brands.filter(b => !b.parentId).map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Brand Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={handleNameChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm outline-none bg-white focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                        required
                                        placeholder="Enter brand name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Brand Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm outline-none bg-white uppercase focus:border-[#017E84] focus:ring-1 focus:ring-[#017E84] transition-colors"
                                        placeholder="e.g. BOSCH"
                                        required
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full bg-[#017E84] hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-sm text-sm transition-colors uppercase tracking-wider flex justify-center items-center"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating...
                                            </span>
                                        ) : "Create Brand"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* TABLE CARD */}
                    <div className="w-full lg:flex-1 bg-white rounded-sm border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#017E84] z-10"></div>

                        {loading ? (
                            <div className="p-12 text-center text-sm font-medium text-gray-500 uppercase tracking-widest">
                                Loading brands...
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full pt-1">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Brand Name & Code</th>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Parent</th>
                                        <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {hierarchicalBrands.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-12 text-center text-gray-500 text-sm">
                                                No brands found.
                                            </td>
                                        </tr>
                                    ) : (
                                        hierarchicalBrands.flatMap(parent => [
                                            <tr key={parent.id} className="hover:bg-[#f9fafb] transition-colors bg-teal-50/20">
                                                <td className="p-4">
                                                    <div className="font-medium text-[#017E84] truncate max-w-[200px]">{parent.name}</div>
                                                    <div className="font-mono text-[10px] text-gray-500 mt-0.5">{parent.code}</div>
                                                </td>
                                                <td className="p-4 text-gray-400">—</td>
                                                <td className="p-4">
                                                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wide uppercase border bg-teal-50 text-[#017E84] border-teal-200">
                                                        Master Brand
                                                    </span>
                                                </td>
                                            </tr>,
                                            ...parent.children.map(child => (
                                                <tr key={child.id} className="hover:bg-[#f9fafb] transition-colors">
                                                    <td className="p-4 pl-10">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-300">└─</span>
                                                            <div>
                                                                <div className="font-medium text-[#374151] truncate max-w-[200px]">{child.name}</div>
                                                                <div className="font-mono text-[10px] text-gray-400 mt-0.5">{child.code}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-gray-500 truncate max-w-[150px]">{parent.name}</td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wide uppercase border bg-gray-50 text-gray-600 border-gray-200">
                                                            Product Line
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ])
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}