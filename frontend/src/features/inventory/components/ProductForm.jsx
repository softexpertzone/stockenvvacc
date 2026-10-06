import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- CARTESIAN PRODUCT ALGORITHM ---
// Combines selected attribute values to generate every possible unique variant row
const generateVariantMatrix = (baseSku, selectedAttributes) => {
    // Only compile attributes that have at least one value selected
    const validAttributes = selectedAttributes.filter(attr => attr.values && attr.values.length > 0);

    if (validAttributes.length === 0) return [];

    const arraysToCombine = validAttributes.map(attr =>
        attr.values.map(val => ({
            attributeDefId: attr.defId,
            attributeValueId: val.id,
            name: val.name,
            attrName: attr.name
        }))
    );

    const cartesian = (arrays) => {
        return arrays.reduce((acc, curr) => {
            return acc.flatMap(c => curr.map(n => [...c, n]));
        }, [[]]);
    };

    const combinations = cartesian(arraysToCombine);

    return combinations.map(combo => {
        // Generate a clean string tracking the traits (e.g., "Color: Red, Size: M")
        const variantLabel = combo.map(c => `${c.attrName}: ${c.name}`).join(', ');

        // Generate a smart SKU suffix code (e.g., "RED-M")
        const skuSuffix = combo.map(c => c.name.toUpperCase().replace(/\s+/g, '').substring(0, 3)).join('-');
        const finalSku = baseSku ? `${baseSku}-${skuSuffix}` : skuSuffix;

        return {
            sku: finalSku,
            price: 0,
            purchasePrice: 0,
            minStockLevel: 5, // Default safe minimum stock limit
            label: variantLabel,
            attributes: combo.map(({ attributeDefId, attributeValueId }) => ({
                attributeDefId,
                attributeValueId
            }))
        };
    });
};

export default function ProductForm() {
    // --- STATE MANAGEMENT ---
    const [baseProduct, setBaseProduct] = useState({ name: '', sku: '', categoryId: '', brandId: '' });
    const [availableAttributes, setAvailableAttributes] = useState([]);
    const [selectedAttributes, setSelectedAttributes] = useState([]);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- FETCH MASTER DATA ON MOUNT ---
    useEffect(() => {
        const fetchAttributes = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/settings/attributes');
                setAvailableAttributes(response.data.data || response.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load global attributes", err);
                setLoading(false);
            }
        };
        fetchAttributes();
    }, []);

    // --- RECALCULATE MATRIX ON CHANGE ---
    // Automatically re-runs combinations whenever attributes are ticked or prefix changes
    useEffect(() => {
        const nextMatrix = generateVariantMatrix(baseProduct.sku, selectedAttributes);
        setVariants(nextMatrix);
    }, [selectedAttributes, baseProduct.sku]);

    // --- HANDLERS FOR THE ATTRIBUTE BUILDER ---
    const handleAddAttributeRow = () => {
        const unusedAttr = availableAttributes.find(
            allAttr => !selectedAttributes.some(sel => sel.defId === allAttr.id)
        );
        if (!unusedAttr) return;

        setSelectedAttributes([
            ...selectedAttributes,
            { defId: unusedAttr.id, name: unusedAttr.name, values: [] }
        ]);
    };

    const handleAttributeTypeChange = (index, targetDefId) => {
        const originalDefinition = availableAttributes.find(attr => attr.id === targetDefId);
        const updated = [...selectedAttributes];
        updated[index] = {
            defId: originalDefinition.id,
            name: originalDefinition.name,
            values: []
        };
        setSelectedAttributes(updated);
    };

    const handleToggleValue = (attrIndex, valueObject) => {
        const updated = [...selectedAttributes];
        const targetValues = updated[attrIndex].values;
        const existingIndex = targetValues.findIndex(v => v.id === valueObject.id);

        if (existingIndex > -1) {
            targetValues.splice(existingIndex, 1);
        } else {
            targetValues.push({ id: valueObject.id, name: valueObject.name });
        }
        setSelectedAttributes(updated);
    };

    const handleRemoveAttributeRow = (index) => {
        setSelectedAttributes(selectedAttributes.filter((_, i) => i !== index));
    };

    // --- INLINE VARIANT ROW VALUE UPDATES ---
    const handleVariantFieldChange = (index, field, value) => {
        const updatedVariants = [...variants];
        updatedVariants[index][field] = value;
        setVariants(updatedVariants);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto bg-white rounded-xl shadow">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Product Registration Template</h2>

            {/* Base Product Fields */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Product Name</label>
                    <input
                        type="text"
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border"
                        value={baseProduct.name}
                        onChange={e => setBaseProduct({...baseProduct, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Base SKU Prefix</label>
                    <input
                        type="text"
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border"
                        placeholder="e.g. TSHIRT"
                        value={baseProduct.sku}
                        onChange={e => setBaseProduct({...baseProduct, sku: e.target.value})}
                    />
                </div>
            </div>

            <hr className="my-6" />

            {/* --- DYNAMIC ATTRIBUTE SELECTOR AREA --- */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Attributes & Variants Options</h3>
                    <button
                        type="button"
                        onClick={handleAddAttributeRow}
                        disabled={selectedAttributes.length === availableAttributes.length}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
                    >
                        + Add Attribute Variant
                    </button>
                </div>

                {loading ? <p>Loading global system attributes...</p> : (
                    <div className="space-y-4">
                        {selectedAttributes.map((selectedAttr, attrIndex) => {
                            const masterDefinition = availableAttributes.find(a => a.id === selectedAttr.defId);

                            return (
                                <div key={attrIndex} className="p-4 bg-gray-50 border rounded-lg flex flex-col md:flex-row gap-4 items-start">
                                    {/* Left Side Dropdown */}
                                    <div className="w-full md:w-1/4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Attribute Type</label>
                                        <select
                                            value={selectedAttr.defId}
                                            onChange={(e) => handleAttributeTypeChange(attrIndex, e.target.value)}
                                            className="mt-1 block w-full rounded border-gray-300 p-2 bg-white border"
                                        >
                                            {availableAttributes.map(allAttr => (
                                                <option
                                                    key={allAttr.id}
                                                    value={allAttr.id}
                                                    disabled={selectedAttributes.some((s, idx) => s.defId === allAttr.id && idx !== attrIndex)}
                                                >
                                                    {allAttr.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Right Side Options Box */}
                                    <div className="flex-1 w-full">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Select Values</label>
                                        <div className="flex flex-wrap gap-2">
                                            {masterDefinition?.values?.map(val => {
                                                const isChecked = selectedAttr.values.some(v => v.id === val.id);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={val.id}
                                                        onClick={() => handleToggleValue(attrIndex, val)}
                                                        className={`px-3 py-1 rounded-full text-sm border font-medium transition-colors ${
                                                            isChecked
                                                                ? 'bg-blue-100 text-blue-800 border-blue-400 shadow-sm'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {isChecked ? '✓ ' : ''}{val.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Delete Row Action */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAttributeRow(attrIndex)}
                                        className="text-red-500 hover:text-red-700 font-bold self-center pt-4"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- GENERATED VARIANTS TABLE MATRIX --- */}
            {variants.length > 0 && (
                <div className="mt-8 border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-100 px-4 py-3 border-b">
                        <h3 className="text-md font-bold text-gray-700">Generated Variant Inventory Records ({variants.length})</h3>
                        <p className="text-xs text-gray-500">Configure parameters for each item combo before submission.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3 text-left">Variant Mix</th>
                                <th className="px-4 py-3 text-left">Specific SKU</th>
                                <th className="px-4 py-3 text-left">Sales Price</th>
                                <th className="px-4 py-3 text-left">Min Stock Level</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {variants.map((variant, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                                {variant.label}
                                            </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            value={variant.sku}
                                            onChange={(e) => handleVariantFieldChange(index, 'sku', e.target.value)}
                                            className="w-full border rounded p-1 text-sm border-gray-300 focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={variant.price}
                                            min="0"
                                            onChange={(e) => handleVariantFieldChange(index, 'price', parseFloat(e.target.value) || 0)}
                                            className="w-24 border rounded p-1 text-sm border-gray-300 focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={variant.minStockLevel}
                                            min="0"
                                            onChange={(e) => handleVariantFieldChange(index, 'minStockLevel', parseInt(e.target.value) || 0)}
                                            className="w-24 border rounded p-1 text-sm border-gray-300 focus:border-blue-500"
                                        />
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}