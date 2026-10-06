'use client';
import { useState } from 'react';
// IMPORT the cascading selector component
import LocationCascadeSelector from './LocationCascadeSelector';

export default function StockMovementModal({ isOpen, onClose, variantId, onUpdate }) {
    const [formData, setFormData] = useState({
        rackId: '',
        quantityChange: 0,
        type: 'ADJUSTMENT',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Safety Check: Enforce WMS rule that a valid rack database ID must be present
        if (!formData.rackId) {
            setError("Compliance Error: You must pick a target warehouse rack layout position.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onUpdate({
                variantId,
                ...formData,
                quantityChange: parseInt(formData.quantityChange, 10)
            });
            onClose();
        } catch (err) {
            setError(err.message || "Failed to update stock.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Adjust Stock Level Manually</h2>

                {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded text-sm font-medium">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* FIXED: Replaced raw input text box with your clean structural selector */}
                    <div className="border rounded-md p-2 bg-gray-50">
                        <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                            Physical Storage Destination
                        </span>
                        <LocationCascadeSelector
                            selectedRackId={formData.rackId}
                            onRackSelect={(rackId) => setFormData({ ...formData, rackId })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Change (+/-)</label>
                        <input
                            required
                            type="number"
                            placeholder="e.g. 50 or -12"
                            className="w-full border border-gray-300 p-2 rounded text-gray-900 bg-white"
                            onChange={e => setFormData({...formData, quantityChange: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Reason/Type</label>
                        <select
                            className="w-full border border-gray-300 p-2 rounded text-gray-900 bg-white"
                            onChange={e => setFormData({...formData, type: e.target.value})}
                        >
                            <option value="ADJUSTMENT">Standard Stock Adjustment</option>
                            <option value="SALE">Manual Outbound Sale Deduction</option>
                            <option value="INITIAL_PO_RECEIVE">Direct Ad-hoc Stock Intake</option>
                            <option value="INTERNAL_TRANSFER">Internal Zone Stock Transfer</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Operational Notes</label>
                        <textarea
                            placeholder="Enter reason for manual audit shift..."
                            className="w-full border border-gray-300 p-2 rounded text-sm text-gray-900 bg-white h-20 resize-none"
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-2 pt-2 border-t justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded font-medium text-sm transition"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium text-sm disabled:bg-blue-300 transition shadow-sm"
                        >
                            {isSubmitting ? 'Processing Audit...' : 'Confirm Balance Shift'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}