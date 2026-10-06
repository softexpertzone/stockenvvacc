import { useInventory } from '../hooks/useInventory';

const InventoryList = () => {
    const { data: response, isLoading, error } = useInventory();

    if (isLoading) return <div className="p-4 text-gray-600">Loading Enterprise Warehouse Map Tree...</div>;
    if (error) return <div className="p-4 text-red-600 font-medium">Error mapping stock layout data: {error.message}</div>;

    const items = response?.data || [];

    return (
        <div className="overflow-x-auto shadow rounded-lg border border-gray-200 m-4">
            <table className="min-w-full divide-y divide-gray-200 text-sm bg-white">
                <thead className="bg-gray-50 text-gray-700 font-semibold uppercase tracking-wider text-left">
                <tr>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">SKU Identifier</th>
                    <th className="px-6 py-3">Granular Location Mapping Hierarchy Path</th>
                    <th className="px-6 py-3">Target Bin</th>
                    <th className="px-6 py-3 text-right">Current Units Stock</th>
                    <th className="px-6 py-3 text-right">Estimated Valuation ($)</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                {items.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-400">
                            No physical inventory matches found inside active ledger.
                        </td>
                    </tr>
                ) : (
                    items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.productName}</td>
                            <td className="px-6 py-4 font-mono">{item.sku}</td>
                            <td className="px-6 py-4 text-xs font-mono text-indigo-600 bg-indigo-50/50 rounded p-1 inline-block my-2">
                                {item.locationPath}
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-700">{item.binName}</td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600">{item.qty}</td>
                            <td className="px-6 py-4 text-right font-mono text-gray-900">${item.value}</td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
};

export default InventoryList;