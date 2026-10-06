'use client';
import { useState, useEffect } from 'react';

export default function RoomRegistration() {
    const [godowns, setGodowns] = useState([]);
    const [selectedGodown, setSelectedGodown] = useState('');
    const [roomName, setRoomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetch('http://localhost:5000/api/warehouse/godowns')
            .then(res => res.json())
            .then(data => setGodowns(Array.isArray(data) ? data : data.data || []));
    }, []);

    const handleSave = async () => {
        if (!selectedGodown || !roomName) return alert("Please select a Godown and enter a Room name.");

        setIsLoading(true);
        const res = await fetch('http://localhost:5000/api/warehouse/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: roomName, godownId: selectedGodown }),
        });

        if (res.ok) {
            setRoomName('');
            alert("Room created successfully!");
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Room Registration</h1>
                    <p className="text-slate-500 text-sm mt-1">Add a new room to your warehouse facility.</p>
                </div>

                <div className="bg-white p-8 rounded border border-slate-200 shadow-sm">
                    <div className="space-y-6">
                        {/* Godown Selection */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Parent Godown
                            </label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 outline-none focus:border-slate-800 transition"
                                onChange={(e) => setSelectedGodown(e.target.value)}
                                value={selectedGodown}
                            >
                                <option value="">Select a Godown...</option>
                                {godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>

                        {/* Room Name */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Room Identifier
                            </label>
                            <input
                                className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-800 transition"
                                placeholder="e.g. Storage Room 101"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="bg-slate-800 hover:bg-slate-950 text-white font-medium px-6 py-2 rounded transition shadow-sm"
                        >
                            {isLoading ? 'Saving...' : 'Confirm'}
                        </button>
                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-2 rounded transition">
                            Discard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}