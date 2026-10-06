"use client";
import React, { useState, useEffect } from 'react';

export default function UnifiedSetupForm() {
    const [hierarchy, setHierarchy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        tier: 'godown',
        name: '',
        parentId: '', // Dynamically maps to godownId, zoneId, etc.
        maxWeightKg: '',
        maxVolumeCm3: '',
        storageClass: 'GENERAL'
    });

    // Fetch existing hierarchy so we can populate the parent dropdowns
    const fetchHierarchy = async () => {
        try {
            // Adjust this URL to match your backend port and route setup
            const res = await fetch('http://localhost:5000/api/warehouse/setup');
            const data = await res.json();
            setHierarchy(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch hierarchy", error);
        }
    };

    useEffect(() => {
        let isMounted = true;

        async function loadWarehouseHierarchy() {
            try {
                const res = await fetch('http://localhost:5000/api/warehouse/setup');
                const data = await res.json();

                // Only update state if the component is still rendered on screen
                if (isMounted) {
                    setHierarchy(data);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to fetch hierarchy", error);
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadWarehouseHierarchy();

        // Cleanup function runs when the component unmounts
        return () => {
            isMounted = false;
        };
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Submitting...');

        // Map the generic parentId to the specific backend requirement
        const payload = {
            tier: formData.tier,
            name: formData.name,
            maxWeightKg: formData.maxWeightKg,
            maxVolumeCm3: formData.maxVolumeCm3,
            storageClass: formData.storageClass
        };

        if (formData.tier === 'zone') payload.godownId = formData.parentId;
        if (formData.tier === 'room') payload.zoneId = formData.parentId;
        if (formData.tier === 'aisle') payload.roomId = formData.parentId;
        if (formData.tier === 'rack') payload.aisleId = formData.parentId;
        if (formData.tier === 'shelf') payload.rackId = formData.parentId;
        if (formData.tier === 'bin') payload.shelfId = formData.parentId;

        try {
            const res = await fetch('http://localhost:5000/api/warehouse/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                setMessage(`Success! Created ${formData.tier}: ${result.name}`);
                setFormData({ ...formData, name: '', maxWeightKg: '', maxVolumeCm3: '' }); // Reset text inputs
                fetchHierarchy(); // Refresh data
            } else {
                setMessage(`Error: ${result.message || result.error}`);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}`);
        }
    };

    if (loading) return <div>Loading warehouse data...</div>;

    return (
        <div className="max-w-xl mx-auto p-6 bg-white shadow-md rounded-md mt-10">
            <h2 className="text-2xl font-bold mb-4">Warehouse Setup Manager</h2>

            {message && (
                <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* TIER SELECTION */}
                <div>
                    <label className="block text-sm font-medium mb-1">Creation Tier</label>
                    <select
                        name="tier"
                        value={formData.tier}
                        onChange={handleChange}
                        className="w-full border p-2 rounded"
                    >
                        <option value="godown">Godown (Top Level)</option>
                        <option value="zone">Zone</option>
                        <option value="room">Room</option>
                        <option value="aisle">Aisle</option>
                        <option value="rack">Rack</option>
                        <option value="shelf">Shelf</option>
                        <option value="bin">Bin</option>
                    </select>
                </div>

                {/* NAME INPUT */}
                <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full border p-2 rounded"
                        placeholder={`e.g., ${formData.tier === 'godown' ? 'Main Facility' : 'A1'}`}
                    />
                </div>

                {/* DYNAMIC PARENT SELECTION */}
                {formData.tier !== 'godown' && (
                    <div>
                        <label className="block text-sm font-medium mb-1">Parent Location</label>
                        <select
                            name="parentId"
                            value={formData.parentId}
                            onChange={handleChange}
                            required
                            className="w-full border p-2 rounded"
                        >
                            <option value="">-- Select Parent --</option>
                            {formData.tier === 'zone' && hierarchy.godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            {formData.tier === 'room' && hierarchy.zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                            {formData.tier === 'aisle' && hierarchy.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            {formData.tier === 'rack' && hierarchy.aisles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            {formData.tier === 'shelf' && hierarchy.racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            {formData.tier === 'bin' && hierarchy.shelves.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                {/* METRICS (Only for Racks, Shelves, Bins) */}
                {['rack', 'shelf', 'bin'].includes(formData.tier) && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Max Weight (Kg)</label>
                            <input
                                type="number"
                                name="maxWeightKg"
                                value={formData.maxWeightKg}
                                onChange={handleChange}
                                className="w-full border p-2 rounded"
                                placeholder="0 = Unlimited"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Max Volume (cm³)</label>
                            <input
                                type="number"
                                name="maxVolumeCm3"
                                value={formData.maxVolumeCm3}
                                onChange={handleChange}
                                className="w-full border p-2 rounded"
                                placeholder="0 = Unlimited"
                            />
                        </div>
                    </div>
                )}

                {/* STORAGE CLASS (Only for Bins) */}
                {formData.tier === 'bin' && (
                    <div>
                        <label className="block text-sm font-medium mb-1">Storage Class</label>
                        <select
                            name="storageClass"
                            value={formData.storageClass}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        >
                            <option value="GENERAL">General</option>
                            <option value="COLD">Cold Storage</option>
                            <option value="HAZARDOUS">Hazardous</option>
                            <option value="HIGH_VALUE">High Value</option>
                        </select>
                    </div>
                )}

                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
                    Create {formData.tier.charAt(0).toUpperCase() + formData.tier.slice(1)}
                </button>
            </form>
        </div>
    );
}