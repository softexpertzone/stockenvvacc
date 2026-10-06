'use client';
import { useState } from 'react';

export default function PurchaseReturnPage({ receivedItems, purchaseOrderId }) {
    // In a real flow, you would fetch the 'receivedItems' based on a selected PO
    const [returnPayload, setReturnPayload] = useState({});
    const [notes, setNotes] = useState('');

    const handleQtyChange = (itemId, variantId, rackId, value, maxQty) => {
        let qty = parseInt(value, 10) || 0;
        if (qty > maxQty) qty = maxQty; // ERP Guardrail UI: Prevent over-returning
        if (qty < 0) qty = 0;

        setReturnPayload(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], variantId, rackId, qty }
        }));
    };

    const handleReasonChange = (itemId, reason) => {
        setReturnPayload(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], reason }
        }));
    };

    const executeReturn = async () => {
        // Filter out items with 0 quantity
        const itemsToReturn = Object.values(returnPayload).filter(item => item.qty > 0);

        if (itemsToReturn.length === 0) return alert("Select at least one item to return.");

        // Ensure all returning items have a reason
        if (itemsToReturn.some(item => !item.reason)) {
            return alert("All returned items must have a designated reason code.");
        }

        const payload = {
            purchaseOrderId,
            notes,
            items: itemsToReturn
        };

        try {
            const res = await fetch(`http://localhost:5000/api/purchase/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                alert("Return successfully processed. Stock deducted and Vendor credit memo logged.");
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert("Network error processing return.");
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto bg-white rounded shadow">
            <h2 className="text-2xl font-bold text-red-700 mb-6 border-b pb-2">Execute Purchase Return (RMA)</h2>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">Return Notes / Vendor RMA #</label>
                <input
                    type="text"
                    className="mt-1 w-full p-2 border rounded outline-none focus:border-red-500"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g., Authorized by John at Supplier X"
                />
            </div>

            <table className="w-full text-left border-collapse mb-6">
                <thead>
                <tr className="bg-gray-100 border-b">
                    <th className="p-3 font-semibold text-sm">Product Name</th>
                    <th className="p-3 font-semibold text-sm">Rack Location</th>
                    <th className="p-3 font-semibold text-sm w-32">Return Qty</th>
                    <th className="p-3 font-semibold text-sm">ERP Reason Code</th>
                </tr>
                </thead>
                <tbody>
                {/* Map through the items currently sitting on racks from this PO */}
                {receivedItems?.map(item => (
                    <tr key={item.id} className="border-b">
                        <td className="p-3 text-sm font-medium">{item.productName}</td>
                        <td className="p-3 text-sm text-gray-500 font-mono">{item.rackId}</td>
                        <td className="p-3">
                            <input
                                type="number"
                                className="w-full p-2 border rounded text-center"
                                min="0"
                                max={item.availableQty}
                                placeholder={`Max: ${item.availableQty}`}
                                onChange={(e) => handleQtyChange(item.id, item.variantId, item.rackId, e.target.value, item.availableQty)}
                            />
                        </td>
                        <td className="p-3">
                            <select
                                className="w-full p-2 border rounded text-sm bg-gray-50"
                                onChange={(e) => handleReasonChange(item.id, e.target.value)}
                            >
                                <option value="">-- Select Reason --</option>
                                <option value="DAMAGED_ON_ARRIVAL">Damaged on Arrival</option>
                                <option value="QUALITY_REJECTION">Quality Rejection</option>
                                <option value="EXPIRED_STOCK">Expired Stock</option>
                                <option value="WRONG_ITEM">Wrong Item Received</option>
                            </select>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            <div className="flex justify-end">
                <button
                    onClick={executeReturn}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition"
                >
                    Confirm & Deduct Stock
                </button>
            </div>
        </div>
    );
}