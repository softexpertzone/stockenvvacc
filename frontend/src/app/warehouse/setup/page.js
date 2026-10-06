'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Building2, Layers, DoorOpen, Navigation,
    Grid, Server, Inbox, Scale,
    AlertTriangle, Save, Calculator, ShieldCheck
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

const TIERS = [
    { value: 'godown', label: 'Godown / Warehouse', icon: Building2, requiresCapacity: false },
    { value: 'zone', label: 'Zone', icon: Layers, requiresCapacity: false },
    { value: 'room', label: 'Room', icon: DoorOpen, requiresCapacity: false },
    { value: 'aisle', label: 'Aisle', icon: Navigation, requiresCapacity: false },
    { value: 'rack', label: 'Rack (Framework)', icon: Grid, requiresCapacity: true },
    { value: 'shelf', label: 'Shelf (Layer)', icon: Server, requiresCapacity: true },
    { value: 'bin', label: 'Bin (Spot)', icon: Inbox, requiresCapacity: true },
];
const STORAGE_CLASSES = ['GENERAL', 'COLD', 'HAZARDOUS', 'HIGH_VALUE', 'PALLET'];
const INITIAL_FORM_DATA = {
    name: '',
    godownId: '',
    zoneId: '',
    roomId: '',
    aisleId: '',
    rackId: '',
    shelfId: '',
    maxWeightKg: '',
    maxVolumeCm3: '',
    storageClass: 'GENERAL',
};

export default function WarehouseSetupPage() {
    const [selectedTier, setSelectedTier] = useState('godown');

    const [hierarchy, setHierarchy] = useState({
        godowns: [], zones: [], rooms: [], aisles: [], racks: [], shelves: []
    });

    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [calc, setCalc] = useState({ lengthCm: '', widthCm: '', heightCm: '' });
    const [showCalc, setShowCalc] = useState(false);

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const fetchAncestors = useCallback(async () => {
        try {
            const res = await apiClient.get('/api/warehouse/setup');
            if (res.data) {
                setHierarchy({
                    godowns: res.data.godowns || [],
                    zones: res.data.zones || [],
                    rooms: res.data.rooms || [],
                    aisles: res.data.aisles || [],
                    racks: res.data.racks || [],
                    shelves: res.data.shelves || []
                });
            }
        } catch (err) {
            console.error("Failed to load structural ancestors:", err);
            setErrors(prev => ({ ...prev, api: 'Failed to load existing warehouse structure.' }));
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const initializeData = async () => {
            if (isMounted) await fetchAncestors();
        };
        initializeData();
        return () => { isMounted = false; };
    }, [fetchAncestors]);

    const handleTierChange = (tierValue) => {
        if (tierValue === selectedTier) return;

        setSelectedTier(tierValue);
        setErrors({});
        setSuccessMsg('');

        setFormData(prev => ({
            ...INITIAL_FORM_DATA,
            name: prev.name,
            storageClass: prev.storageClass
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const calculateVolume = () => {
        const l = parseFloat(calc.lengthCm);
        const w = parseFloat(calc.widthCm);
        const h = parseFloat(calc.heightCm);

        if (isNaN(l) || isNaN(w) || isNaN(h) || l <= 0 || w <= 0 || h <= 0) {
            alert("Please enter positive dimensions to calculate volume.");
            return;
        }

        const volume = (l * w * h).toFixed(2);
        handleInputChange({ target: { name: 'maxVolumeCm3', value: volume }});
        setShowCalc(false);
    };

    const validateForm = () => {
        const newErrors = {};
        const tierConfig = TIERS.find(t => t.value === selectedTier);

        if (!formData.name.trim()) newErrors.name = 'Identifier is required';

        if (selectedTier === 'zone' && !formData.godownId) newErrors.godownId = 'Target Godown is required';
        if (selectedTier === 'room' && !formData.zoneId) newErrors.zoneId = 'Target Zone is required';
        if (selectedTier === 'aisle' && !formData.roomId) newErrors.roomId = 'Target Room is required';
        if (selectedTier === 'rack' && !formData.aisleId) newErrors.aisleId = 'Target Aisle is required';
        if (selectedTier === 'shelf' && !formData.rackId) newErrors.rackId = 'Target Rack is required';
        if (selectedTier === 'bin') {
            if (!formData.shelfId) newErrors.shelfId = 'Target Shelf is required';
            if (!formData.godownId) newErrors.godownId = 'Target Godown is required for routing';
        }

        if (tierConfig?.requiresCapacity) {
            const weight = parseFloat(formData.maxWeightKg);
            if (!formData.maxWeightKg || isNaN(weight) || weight <= 0) {
                newErrors.maxWeightKg = 'Must be a positive number';
            }

            const volume = parseFloat(formData.maxVolumeCm3);
            if (!formData.maxVolumeCm3 || isNaN(volume) || volume <= 0) {
                newErrors.maxVolumeCm3 = 'Must be a positive number';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrors({});
        if (!validateForm()) return;
        setLoading(true);
        try {
            const rawPayload = { tier: selectedTier, ...formData };

            if (selectedTier !== 'bin') {
                delete rawPayload.storageClass;
            }

            if (rawPayload.maxWeightKg) rawPayload.maxWeightKg = parseFloat(rawPayload.maxWeightKg);
            if (rawPayload.maxVolumeCm3) rawPayload.maxVolumeCm3 = parseFloat(rawPayload.maxVolumeCm3);

            const payload = Object.entries(rawPayload)
                .reduce((acc, [key, value]) => {
                    if (value !== '') acc[key] = value;
                    return acc;
                }, {});

            await apiClient.post('/api/warehouse/setup', payload);
            await fetchAncestors();
            setSuccessMsg(`Successfully created ${selectedTier.toUpperCase()} "${formData.name}"`);
            setFormData(INITIAL_FORM_DATA);
        } catch (err) {
            setErrors({ api: err.response?.data?.message || 'Error executing database transaction.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Unified Warehouse Layout Manager</h1>
                <p className="text-sm text-gray-500">Configure space mapping and set rigid safety parameters for put-away calculations.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* --- Sidebar Navigation --- */}
                <nav className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2 h-fit" aria-label="Tier Selection">
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Unit Level</span>
                    {TIERS.map((tier) => {
                        const Icon = tier.icon;
                        const isActive = selectedTier === tier.value;
                        return (
                            <button
                                key={tier.value}
                                onClick={() => handleTierChange(tier.value)}
                                disabled={loading}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                                    isActive
                                        ? 'bg-[#017E84]/10 text-[#017E84] border-l-4 border-[#017E84] pl-4'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                                }`}
                                type="button"
                                aria-pressed={isActive}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#017E84]' : 'text-gray-400'}`} />
                                    <span>{tier.label}</span>
                                </div>
                                {tier.requiresCapacity && (
                                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-mono" aria-label="Capacity Enforced">
                                        Capacity
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* --- Main Configuration Form --- */}
                <main className="md:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
                    {successMsg && (
                        <div role="status" className="mb-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm font-medium flex items-center gap-2">
                            🎉 {successMsg}
                        </div>
                    )}
                    {errors.api && (
                        <div role="alert" className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {errors.api}
                        </div>
                    )}
                    <form onSubmit={handleSave} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                Name / Code Identifier
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                disabled={loading}
                                placeholder={`e.g., ${selectedTier.toUpperCase()}-01`}
                                value={formData.name}
                                onChange={handleInputChange}
                                aria-invalid={!!errors.name}
                                className={`w-full p-2 border text-sm rounded-lg focus:ring-1 focus:outline-none disabled:bg-gray-50 ${
                                    errors.name ? 'border-red-500 focus:ring-red-100' : 'border-gray-300 focus:ring-[#017E84]/20 focus:border-[#017E84]'
                                }`}
                            />
                            {errors.name && <span className="text-xs text-red-500 mt-1 block" role="alert">{errors.name}</span>}
                        </div>

                        {selectedTier !== 'godown' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                {selectedTier === 'zone' && (
                                    <div>
                                        <label htmlFor="godownId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Godown (Parent)</label>
                                        <select
                                            id="godownId"
                                            name="godownId"
                                            disabled={loading}
                                            value={formData.godownId}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 text-sm rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] disabled:bg-gray-100 disabled:text-gray-500"
                                        >
                                            <option value="">-- Choose Godown --</option>
                                            {hierarchy.godowns.map(g => (
                                                <option key={g.id} value={g.id} className="text-gray-900">
                                                    {g.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.godownId && <span className="text-xs text-red-500 mt-1 block">{errors.godownId}</span>}
                                    </div>
                                )}
                                {selectedTier === 'room' && (
                                    <div>
                                        <label htmlFor="zoneId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Zone (Parent)</label>
                                        <select
                                            id="zoneId"
                                            name="zoneId"
                                            disabled={loading}
                                            value={formData.zoneId}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 text-sm rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] disabled:bg-gray-100 disabled:text-gray-500"
                                        >
                                            <option value="" className="text-gray-500">-- Choose Zone --</option>
                                            {hierarchy.zones.map(z => (
                                                <option key={z.id} value={z.id} className="text-gray-900">
                                                    {z.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.zoneId && <span className="text-xs text-red-500 mt-1 block">{errors.zoneId}</span>}
                                    </div>
                                )}
                                {selectedTier === 'aisle' && (
                                    <div>
                                        <label htmlFor="roomId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Room (Parent)</label>
                                        <select
                                            id="roomId"
                                            name="roomId"
                                            disabled={loading}
                                            value={formData.roomId}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 text-sm rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] disabled:bg-gray-100 disabled:text-gray-500"
                                        >
                                            <option value="" className="text-gray-500">-- Choose Room --</option>
                                            {hierarchy.rooms.map(r => (
                                                <option key={r.id} value={r.id} className="text-gray-900">
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.roomId && <span className="text-xs text-red-500 mt-1 block">{errors.roomId}</span>}
                                    </div>
                                )}
                                {selectedTier === 'rack' && (
                                    <div>
                                        <label htmlFor="aisleId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Aisle (Parent)</label>
                                        <select
                                            id="aisleId"
                                            name="aisleId"
                                            disabled={loading}
                                            value={formData.aisleId}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 text-sm rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] disabled:bg-gray-100 disabled:text-gray-500"
                                        >
                                            <option value="" className="text-gray-500">-- Choose Aisle --</option>
                                            {hierarchy.aisles.map(a => (
                                                <option key={a.id} value={a.id} className="text-gray-900">
                                                    {a.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.aisleId && <span className="text-xs text-red-500 mt-1 block">{errors.aisleId}</span>}
                                    </div>
                                )}
                                {selectedTier === 'shelf' && (
                                    <div>
                                        <label htmlFor="rackId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Rack (Parent)</label>
                                        <select
                                            id="rackId"
                                            name="rackId"
                                            disabled={loading}
                                            value={formData.rackId}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 text-sm rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] disabled:bg-gray-100 disabled:text-gray-500"
                                        >
                                            <option value="" className="text-gray-500">-- Choose Rack --</option>
                                            {hierarchy.racks.map(r => (
                                                <option key={r.id} value={r.id} className="text-gray-900">
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.rackId && <span className="text-xs text-red-500 mt-1 block">{errors.rackId}</span>}
                                    </div>
                                )}
                                {selectedTier === 'bin' && (
                                    <>
                                        <div>
                                            <label htmlFor="shelfId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Shelf (Parent)</label>
                                            <select
                                                id="shelfId"
                                                name="shelfId"
                                                disabled={loading}
                                                value={formData.shelfId}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-300 text-sm rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] disabled:bg-gray-100 disabled:text-gray-500"
                                            >
                                                <option value="" className="text-gray-500">-- Choose Shelf --</option>
                                                {hierarchy.shelves.map(s => (
                                                    <option key={s.id} value={s.id} className="text-gray-900">
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.shelfId && <span className="text-xs text-red-500 mt-1 block">{errors.shelfId}</span>}
                                        </div>
                                        <div>
                                            <label htmlFor="binGodownId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assigned Godown</label>
                                            <select
                                                id="binGodownId"
                                                name="godownId"
                                                disabled={loading}
                                                value={formData.godownId}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-300 text-sm rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] disabled:bg-gray-100 disabled:text-gray-500"
                                            >
                                                <option value="" className="text-gray-500">-- Choose Godown --</option>
                                                {hierarchy.godowns.map(g => (
                                                    <option key={g.id} value={g.id} className="text-gray-900">
                                                        {g.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.godownId && <span className="text-xs text-red-500 mt-1 block">{errors.godownId}</span>}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {selectedTier === 'bin' && (
                            <div>
                                <label htmlFor="storageClass" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#017E84]" /> Storage Environmental Class
                                </label>
                                <select
                                    id="storageClass"
                                    name="storageClass"
                                    disabled={loading}
                                    value={formData.storageClass}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 text-sm rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#017E84] focus:border-[#017E84] disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                    {STORAGE_CLASSES.map(sc => (
                                        <option key={sc} value={sc} className="text-gray-900">
                                            {sc}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {TIERS.find(t => t.value === selectedTier)?.requiresCapacity && (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-slate-500" /> Physical Capacity Boundaries
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="maxWeightKg" className="block text-[11px] font-semibold text-gray-600 mb-1">Maximum Safe Load (kg)</label>
                                        <div className="relative">
                                            <input
                                                id="maxWeightKg"
                                                name="maxWeightKg"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                disabled={loading}
                                                placeholder="0.00"
                                                value={formData.maxWeightKg}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 pr-8 border text-sm rounded-lg focus:outline-none focus:ring-1 disabled:bg-gray-100 ${
                                                    errors.maxWeightKg ? 'border-red-500 focus:ring-red-100' : 'border-gray-300 focus:ring-[#017E84]/20 focus:border-[#017E84]'
                                                }`}
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 font-medium select-none pointer-events-none">kg</span>
                                        </div>
                                        {errors.maxWeightKg && <span className="text-xs text-red-500 mt-1 block">{errors.maxWeightKg}</span>}
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label htmlFor="maxVolumeCm3" className="block text-[11px] font-semibold text-gray-600">Total Volume Capacity (cm³)</label>
                                            <button
                                                type="button"
                                                disabled={loading}
                                                onClick={() => setShowCalc(true)}
                                                className="text-[10px] text-[#017E84] font-semibold flex items-center gap-0.5 hover:underline disabled:opacity-50"
                                            >
                                                <Calculator className="w-3 h-3" /> Calculator
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                id="maxVolumeCm3"
                                                name="maxVolumeCm3"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                disabled={loading}
                                                placeholder="0.00"
                                                value={formData.maxVolumeCm3}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 pr-10 border text-sm rounded-lg focus:outline-none focus:ring-1 disabled:bg-gray-100 ${
                                                    errors.maxVolumeCm3 ? 'border-red-500 focus:ring-red-100' : 'border-gray-300 focus:ring-[#017E84]/20 focus:border-[#017E84]'
                                                }`}
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 font-medium select-none pointer-events-none">cm³</span>
                                        </div>
                                        {errors.maxVolumeCm3 && <span className="text-xs text-red-500 mt-1 block">{errors.maxVolumeCm3}</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#017E84] hover:bg-[#01656A] text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Executing Configuration...' : 'Commit Structural Element'}
                        </button>
                    </form>

                    {/* --- Storage Volume Overlay Assistant --- */}
                    {showCalc && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl p-6 flex flex-col justify-center border border-gray-200 shadow-md z-10" role="dialog" aria-modal="true" aria-labelledby="calc-title">
                            <div className="mb-4">
                                <h4 id="calc-title" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-[#017E84]" /> Storage Volume Assistant
                                </h4>
                                <p className="text-xs text-gray-500">Calculate volume in cubic centimeters:</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Length (cm)</label>
                                    <input
                                        type="number"
                                        name="lengthCm"
                                        value={calc.lengthCm}
                                        onChange={(e) => setCalc({ ...calc, lengthCm: e.target.value })}
                                        className="w-full p-2 border border-gray-300 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-[#017E84]/20 focus:border-[#017E84]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Width (cm)</label>
                                    <input
                                        type="number"
                                        name="widthCm"
                                        value={calc.widthCm}
                                        onChange={(e) => setCalc({ ...calc, widthCm: e.target.value })}
                                        className="w-full p-2 border border-gray-300 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-[#017E84]/20 focus:border-[#017E84]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Height (cm)</label>
                                    <input
                                        type="number"
                                        name="heightCm"
                                        value={calc.heightCm}
                                        onChange={(e) => setCalc({ ...calc, heightCm: e.target.value })}
                                        className="w-full p-2 border border-gray-300 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-[#017E84]/20 focus:border-[#017E84]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCalc(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={calculateVolume}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#017E84] rounded-md hover:bg-[#01656A] transition-colors"
                                >
                                    Apply Volume
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}