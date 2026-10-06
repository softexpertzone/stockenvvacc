'use client';
import { useState } from 'react';
import apiClient from '@/lib/apiClient';
import LocationCascadeSelector from '@/features/inventory/components/LocationCascadeSelector';

export default function AuditPage() {
    const [audit, setAudit] = useState({
        productVariantId: '',
        rackId: '',
        physicalCount: 0,
        reason: 'COUNT_ERROR'
    });

    const handleReconcile = async () => {
        try {
            await apiClient.post('/inventory/audit', audit);
            alert("Inventory successfully reconciled.");
        } catch (err) {
            alert(err.response?.data?.error || "Reconciliation failed.");
        }
    };

    return (
        <div className="max-w-xl mx-auto p-8 bg-white rounded-lg shadow">
            <h1 className="text-xl font-bold mb-6">Stock Take (Physical Audit)</h1>

            <div className="space-y-4">
                <input
                    placeholder="Product SKU/ID"
                    className="w-full p-2 border rounded"
                    onChange={e => setAudit({...audit, productVariantId: e.target.value})}
                />

                <LocationCascadeSelector onRackSelect={(id) => setAudit({...audit, rackId: id})} />

                <input
                    type="number"
                    placeholder="Actual Physical Count"
                    className="w-full p-2 border rounded"
                    onChange={e => setAudit({...audit, physicalCount: parseInt(e.target.value)})}
                />

                <select className="w-full p-2 border rounded" onChange={e => setAudit({...audit, reason: e.target.value})}>
                    <option value="COUNT_ERROR">Counting Error</option>
                    <option value="DAMAGED">Damaged Goods</option>
                    <option value="LOST">Lost / Misplaced</option>
                    <option value="THEFT">Suspected Theft</option>
                </select>

                <button onClick={handleReconcile} className="w-full bg-orange-600 text-white p-3 rounded font-bold">
                    Commit Adjustment
                </button>
            </div>
        </div>
    );
}