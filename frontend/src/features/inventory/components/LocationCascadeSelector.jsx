'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const LocationCascadeSelector = ({
                                     selectedGodownId,
                                     selectedRoomId,
                                     selectedRackId,
                                     selectedBinId = '',
                                     onGodownSelect,
                                     onRoomSelect,
                                     onRackSelect,
                                     onBinSelect,
                                     onLocationSelect,
                                 }) => {
    const [godowns, setGodowns] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [racks, setRacks] = useState([]);
    const [bins, setBins] = useState([]);

    const [localGodown, setLocalGodown] = useState('');
    const [localRoom, setLocalRoom] = useState('');
    const [localRack, setLocalRack] = useState('');
    const [localBin, setLocalBin] = useState('');

    const isResolving = useRef(false);
    const lastResolvedBin = useRef('');

    const activeGodownId =
        selectedGodownId !== undefined && selectedGodownId !== null
            ? selectedGodownId
            : localGodown;
    const activeRoomId =
        selectedRoomId !== undefined && selectedRoomId !== null
            ? selectedRoomId
            : localRoom;
    const activeRackId =
        selectedRackId !== undefined && selectedRackId !== null
            ? selectedRackId
            : localRack;
    const activeBinId = selectedBinId || localBin;

    // ---------- 1. Load Godowns ----------
    useEffect(() => {
        let mounted = true;
        axios
            .get(`${API_BASE}/api/warehouse/godowns`)
            .then((res) => {
                if (!mounted) return;
                const data = res.data?.success ? res.data.data : res.data;
                setGodowns(Array.isArray(data) ? data : []);
            })
            .catch((err) => console.error('Failed to load Godowns:', err));
        return () => {
            mounted = false;
        };
    }, []);

    // ---------- 2. Load Rooms ----------
    useEffect(() => {
        if (!activeGodownId) return;

        let mounted = true;
        axios
            .get(`${API_BASE}/api/warehouse/godowns/${activeGodownId}/rooms`)
            .then((res) => {
                if (!mounted) return;
                const data = res.data?.success ? res.data.data : res.data;
                setRooms(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (mounted) setRooms([]);
            });
        return () => {
            mounted = false;
        };
    }, [activeGodownId]);

    // ---------- 3. Load Racks ----------
    useEffect(() => {
        if (!activeRoomId) return;

        let mounted = true;
        axios
            .get(`${API_BASE}/api/warehouse/rooms/${activeRoomId}/racks`)
            .then((res) => {
                if (!mounted) return;
                const data = res.data?.success ? res.data.data : res.data;
                setRacks(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (mounted) setRacks([]);
            });
        return () => {
            mounted = false;
        };
    }, [activeRoomId]);

    // ---------- 4. Load Bins ----------
    useEffect(() => {
        if (!activeRackId) return;

        let mounted = true;
        axios
            .get(`${API_BASE}/api/warehouse/racks/${activeRackId}/bins`)
            .then((res) => {
                if (!mounted) return;
                const data = res.data?.success ? res.data.data : res.data;
                setBins(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (mounted) setBins([]);
            });
        return () => {
            mounted = false;
        };
    }, [activeRackId]);

    // ---------- 5. Auto-resolve Room + Rack + Bin from godownId + binId ----------
    useEffect(() => {
        // Only run when we have godown + bin but missing room/rack
        if (
            !selectedBinId ||
            !activeGodownId ||
            activeRoomId ||
            activeRackId ||
            isResolving.current ||
            lastResolvedBin.current === selectedBinId
        ) {
            return;
        }

        let mounted = true;
        isResolving.current = true;

        (async () => {
            try {
                // 1. Get all rooms of this godown
                const roomsRes = await axios.get(
                    `${API_BASE}/api/warehouse/godowns/${activeGodownId}/rooms`
                );
                const roomList = roomsRes.data?.success
                    ? roomsRes.data.data
                    : roomsRes.data;
                if (!mounted || !Array.isArray(roomList)) return;

                for (const room of roomList) {
                    // 2. Get racks of each room
                    const racksRes = await axios.get(
                        `${API_BASE}/api/warehouse/rooms/${room.id}/racks`
                    );
                    const rackList = racksRes.data?.success
                        ? racksRes.data.data
                        : racksRes.data;
                    if (!mounted || !Array.isArray(rackList)) continue;

                    for (const rack of rackList) {
                        // 3. Get bins of each rack
                        const binsRes = await axios.get(
                            `${API_BASE}/api/warehouse/racks/${rack.id}/bins`
                        );
                        const binList = binsRes.data?.success
                            ? binsRes.data.data
                            : binsRes.data;
                        if (!mounted || !Array.isArray(binList)) continue;

                        const found = binList.find((b) => b.id === selectedBinId);
                        if (found) {
                            // Found the path!
                            setLocalGodown(activeGodownId);
                            setLocalRoom(room.id);
                            setLocalRack(rack.id);
                            setLocalBin(selectedBinId);

                            setRooms(roomList);
                            setRacks(rackList);
                            setBins(binList);

                            onGodownSelect?.(activeGodownId);
                            onRoomSelect?.(room.id);
                            onRackSelect?.(rack.id);
                            onBinSelect?.(selectedBinId);
                            onLocationSelect?.({
                                godownId: activeGodownId,
                                roomId: room.id,
                                rackId: rack.id,
                                binId: selectedBinId,
                            });

                            lastResolvedBin.current = selectedBinId;
                            return;
                        }
                    }
                }

                console.warn('Could not resolve location path for bin:', selectedBinId);
            } catch (err) {
                console.error('Auto-resolve location failed:', err);
            } finally {
                isResolving.current = false;
            }
        })();

        return () => {
            mounted = false;
        };
    }, [selectedBinId, activeGodownId, activeRoomId, activeRackId]);

    // ---------- Handlers ----------
    const handleGodownChange = (e) => {
        const id = e.target.value;
        setLocalGodown(id);
        setLocalRoom('');
        setLocalRack('');
        setLocalBin('');
        setRooms([]);
        setRacks([]);
        setBins([]);
        lastResolvedBin.current = '';

        onGodownSelect?.(id);
        onRoomSelect?.('');
        onRackSelect?.('');
        onBinSelect?.('');
        onLocationSelect?.({ godownId: id, roomId: '', rackId: '', binId: '' });
    };

    const handleRoomChange = (e) => {
        const id = e.target.value;
        setLocalRoom(id);
        setLocalRack('');
        setLocalBin('');
        setRacks([]);
        setBins([]);
        lastResolvedBin.current = '';

        onRoomSelect?.(id);
        onRackSelect?.('');
        onBinSelect?.('');
        onLocationSelect?.({
            godownId: activeGodownId,
            roomId: id,
            rackId: '',
            binId: '',
        });
    };

    const handleRackChange = (e) => {
        const id = e.target.value;
        setLocalRack(id);
        setLocalBin('');
        setBins([]);
        lastResolvedBin.current = '';

        onRackSelect?.(id);
        onBinSelect?.('');
        onLocationSelect?.({
            godownId: activeGodownId,
            roomId: activeRoomId,
            rackId: id,
            binId: '',
        });
    };

    const handleBinChange = (e) => {
        const id = e.target.value;
        setLocalBin(id);

        onBinSelect?.(id);
        onLocationSelect?.({
            godownId: activeGodownId,
            roomId: activeRoomId,
            rackId: activeRackId,
            binId: id,
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Godown / Warehouse
                </label>
                <select
                    value={activeGodownId || ''}
                    onChange={handleGodownChange}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                >
                    <option value="">-- Godown --</option>
                    {godowns.map((g) => (
                        <option key={g.id} value={g.id}>
                            {g.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Room / Section
                </label>
                <select
                    value={activeRoomId || ''}
                    onChange={handleRoomChange}
                    disabled={!activeGodownId}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                    <option value="">-- Room --</option>
                    {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Storage Rack
                </label>
                <select
                    value={activeRackId || ''}
                    onChange={handleRackChange}
                    disabled={!activeRoomId}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                    <option value="">-- Rack --</option>
                    {racks.map((rk) => (
                        <option key={rk.id} value={rk.id}>
                            {rk.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Bin <span className="text-red-500">*</span>
                </label>
                <select
                    value={activeBinId || ''}
                    onChange={handleBinChange}
                    disabled={!activeRackId}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                    <option value="">-- Bin --</option>
                    {bins.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocationCascadeSelector;