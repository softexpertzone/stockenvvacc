'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function WarehouseDispatchPage() {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);

    // Fetch the real Pending Pick Lists on load
    useEffect(() => {
        fetchPendingDispatches();
    }, []);

    const fetchPendingDispatches = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/sales/pending-dispatches', {
                withCredentials: true
            });
            setPendingOrders(response.data.data || []);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to load pick lists from the backend.");
        } finally {
            setLoading(false);
        }
    };

    const executeDispatch = async (orderId) => {
        try {
            setProcessingId(orderId);
            await axios.post('http://localhost:5000/api/sales/dispatch', { orderId }, {
                withCredentials: true
            });

            alert("Goods dispatched successfully. Stock permanently deducted from physical bins.");
            setPendingOrders(prev => prev.filter(o => o.id !== orderId));
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Error processing dispatch.");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-6xl mx-auto min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-500 font-semibold animate-pulse">Loading Live Pick Lists...</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Warehouse Outbound Dispatch (Pick Lists)</h1>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200 mb-6">
                    {error}
                </div>
            )}

            {pendingOrders.length === 0 && !error && (
                <div className="p-6 bg-white rounded border text-center text-gray-500 shadow-sm">
                    No pending orders to dispatch. The loading dock is clear.
                </div>
            )}

            <div className="space-y-6">
                {pendingOrders.map(order => (
                    <div key={order.id} className="bg-white p-6 border rounded-lg shadow-sm border-l-4 border-l-orange-500">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{order.invoiceNumber || order.id}</h2>
                                <p className="text-sm text-gray-500">Status: {order.status}</p>
                            </div>
                            <button
                                onClick={() => executeDispatch(order.id)}
                                disabled={processingId === order.id}
                                className={`px-6 py-2 font-bold rounded shadow transition text-white
                                    ${processingId === order.id
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-orange-500 hover:bg-orange-600'}`}
                            >
                                {processingId === order.id ? 'Processing...' : 'Mark as Dispatched'}
                            </button>
                        </div>

                        <div className="bg-orange-50 text-orange-800 text-sm p-3 rounded mb-4 font-medium">
                            Follow the allocated pick list below to pull stock from the correct physical locations (FIFO enforced).
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-3 font-semibold text-sm">Variant ID</th>
                                <th className="p-3 font-semibold text-sm text-center">Pull Qty</th>
                                <th className="p-3 font-semibold text-sm text-right">Target Bin / Location</th>
                            </tr>
                            </thead>
                            <tbody>
                            {order.items.map(item =>
                                item.stockAllocations.map(alloc => (
                                    <tr key={alloc.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 text-sm font-mono text-gray-600">
                                            {item.productVariantId.substring(0, 8)}...
                                        </td>
                                        <td className="p-3 text-sm text-center font-mono font-bold text-blue-600">
                                            {alloc.quantity} units
                                        </td>
                                        <td className="p-3 text-sm font-mono font-bold text-gray-800 text-right">
                                            📍 {alloc.bin?.name || "Unassigned"}
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
}