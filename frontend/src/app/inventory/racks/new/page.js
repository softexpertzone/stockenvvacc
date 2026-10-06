'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../../../../config/apiEndpoints';

export default function NewRackPage() {
    const [formData, setFormData] = useState({ name: '', roomId: '', maxWeightKg: '', maxCapacity: '' });
    const [rooms, setRooms] = useState([]);

    // 1. Fetch rooms on mount so the user can select one
    useEffect(() => {
        axios.get(`${API_BASE}/rooms`).then(res => setRooms(res.data.data));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/racks`, formData);
            alert("Rack created successfully!");
        } catch (err) {
            alert("Failed to create rack: " + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Rack Registration</h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded shadow-sm p-6">
                    <div className="grid grid-cols-1 gap-6">

                        {/* Room Selection (Required for your Relation) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Select Room</label>
                            <select
                                className="w-full border border-slate-300 rounded px-3 py-2"
                                onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                            >
                                <option value="">Select a room...</option>
                                {rooms.map(room => (
                                    <option key={room.id} value={room.id}>{room.name} ({room.godown.name})</option>
                                ))}
                            </select>
                        </div>

                        {/* Rack Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Rack Name</label>
                            <input
                                className="w-full border border-slate-300 rounded px-3 py-2"
                                placeholder="e.g. A-01-B"
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                        {/* Capacity Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Max Weight (Kg)</label>
                                <input
                                    type="number"
                                    className="w-full border border-slate-300 rounded px-3 py-2"
                                    onChange={(e) => setFormData({...formData, maxWeightKg: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Max Capacity (Units)</label>
                                <input
                                    type="number"
                                    className="w-full border border-slate-300 rounded px-3 py-2"
                                    onChange={(e) => setFormData({...formData, maxCapacity: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t flex gap-3">
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-semibold">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}