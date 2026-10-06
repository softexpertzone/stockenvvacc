'use client';
import { useState, useEffect } from 'react';

export default function NewRackPage() {
    const [godowns, setGodowns] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedGodown, setSelectedGodown] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');

    // Core details
    const [rackName, setRackName] = useState('');

    // Spatial & Capacity details
    const [lengthCm, setLengthCm] = useState('');
    const [widthCm, setWidthCm] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [maxWeightKg, setMaxWeightKg] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    // 1. Fetch Godowns on mount
    useEffect(() => {
        fetch('http://localhost:5000/api/warehouse/godowns')
            .then(res => res.json())
            .then(data => setGodowns(Array.isArray(data) ? data : data.data || []));
    }, []);

    // 2. Fetch Rooms when Godown is selected
    const handleGodownChange = async (godownId) => {
        setSelectedGodown(godownId);
        setSelectedRoom('');
        setRooms([]);
        if (!godownId) return;

        const res = await fetch(`http://localhost:5000/api/warehouse/godowns/${godownId}/rooms`);
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : data.data || []);
    };

    const handleAdd = async () => {
        if (!selectedRoom || !rackName || !lengthCm || !widthCm || !heightCm || !maxWeightKg) {
            return alert("Please complete all fields, including physical dimensions and weight capacity.");
        }

        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/warehouse/racks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: rackName,
                    roomId: selectedRoom,
                    lengthCm: parseFloat(lengthCm),
                    widthCm: parseFloat(widthCm),
                    heightCm: parseFloat(heightCm),
                    maxWeightKg: parseFloat(maxWeightKg)
                }),
            });

            if (res.ok) {
                setRackName('');
                setLengthCm('');
                setWidthCm('');
                setHeightCm('');
                setMaxWeightKg('');
                alert("Rack successfully configured with spatial data!");
            } else {
                const errorData = await res.json();
                alert(`Failed to create rack: ${errorData.error || 'Check server logs.'}`);
            }
        } catch (err) {
            alert("Network error. Ensure backend is running.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Register New Rack</h1>
                    <p className="text-slate-500 text-sm mt-1">Add a new spatially-aware storage rack to your hierarchy.</p>
                </div>

                <div className="bg-white p-8 rounded border border-slate-200 shadow-sm space-y-6">
                    {/* Godown Selector */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Godown</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 focus:border-slate-800 outline-none transition"
                            onChange={(e) => handleGodownChange(e.target.value)}
                            value={selectedGodown}
                        >
                            <option value="">Select a Godown...</option>
                            {godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>

                    {/* Room Selector */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Room</label>
                        <select
                            disabled={!selectedGodown}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 disabled:opacity-50 focus:border-slate-800 outline-none transition"
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            value={selectedRoom}
                        >
                            <option value="">{selectedGodown ? "Select a Room..." : "Select a Godown first..."}</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>

                    {/* Rack Name */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rack Identifier</label>
                        <input
                            disabled={!selectedRoom}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 placeholder:text-slate-400 disabled:opacity-50 focus:border-slate-800 outline-none transition"
                            placeholder="e.g. Rack-A1"
                            value={rackName}
                            onChange={(e) => setRackName(e.target.value)}
                        />
                    </div>

                    {/* SPATIAL DIMENSIONS (3-Column Grid) */}
                    <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Length (cm)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!selectedRoom}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 disabled:opacity-50 focus:border-slate-800 outline-none transition"
                                placeholder="120"
                                value={lengthCm}
                                onChange={(e) => setLengthCm(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Width (cm)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!selectedRoom}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 disabled:opacity-50 focus:border-slate-800 outline-none transition"
                                placeholder="60"
                                value={widthCm}
                                onChange={(e) => setWidthCm(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Height (cm)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!selectedRoom}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 disabled:opacity-50 focus:border-slate-800 outline-none transition"
                                placeholder="200"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* WEIGHT CAPACITY */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Max Weight Capacity (kg)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!selectedRoom}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 disabled:opacity-50 focus:border-slate-800 outline-none transition"
                            placeholder="500"
                            value={maxWeightKg}
                            onChange={(e) => setMaxWeightKg(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={handleAdd}
                            disabled={isLoading || !selectedRoom}
                            className="bg-slate-800 hover:bg-slate-950 text-white font-medium px-6 py-2 rounded transition shadow-sm disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}