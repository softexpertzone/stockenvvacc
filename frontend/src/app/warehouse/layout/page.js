'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/api/axiosConfig';

export default function WarehouseLayoutPage() {
    const [layout, setLayout] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        apiClient.get('/warehouse/godowns')
            .then(res => {
                setLayout(res.data.data || []);
                setError(null);
            })
            .catch(err => {
                console.error("Warehouse Layout Load Error:", err);
                setError("Failed to load warehouse layout structure.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-600 animate-pulse">Loading Warehouse Map...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-600 font-bold">{error}</div>;
    }

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Warehouse Map</h2>

            {layout.length === 0 ? (
                <p className="text-slate-500 text-center">No warehouse structures found.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {layout.map((godown) => (
                        <div key={godown.id} className="border p-4 rounded-xl shadow-sm bg-white border-slate-200">
                            {/* Updated theme color applied here */}
                            <h3 className="font-bold text-lg text-[#017E84]">{godown.name}</h3>

                            {godown.rooms && godown.rooms.length > 0 ? (
                                godown.rooms.map(room => (
                                    <div key={room.id} className="ml-4 mt-3 pt-2 border-t border-slate-100">
                                        <p className="font-semibold text-slate-700 text-sm">{room.name}</p>

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {(room.racks || []).map(rack => (
                                                <div key={rack.id} className="bg-slate-50 p-2 rounded-lg text-xs border border-slate-200 text-slate-600">
                                                    <span className="font-medium text-slate-900">{rack.name}</span>
                                                    <span className="ml-1 text-slate-400">({rack.inventory?.length || 0} items)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 text-sm italic mt-2 ml-4">No rooms defined</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}