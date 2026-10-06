// components/ui/DataTable.js
export default function DataTable({ columns, data }) {
    // If columns is an array of strings, use them as headers and map to object keys
    // If columns is an array of objects, use them for more control

    const isStringArray = columns.length > 0 && typeof columns[0] === 'string';

    // Map string columns to object keys (lowercase)
    const columnKeys = isStringArray
        ? columns.map(col => col.toLowerCase())
        : columns.map(col => col.key || col);

    return (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                    {columns.map((col, index) => (
                        <th key={index} className="p-4 font-bold text-slate-600 uppercase">
                            {isStringArray ? col : (col.header || col)}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {data.length > 0 ? (
                    data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50">
                            {columnKeys.map((key, cellIndex) => {
                                // Handle nested objects or custom rendering
                                let value = row[key];

                                // If value is an object, stringify it or show a placeholder
                                if (typeof value === 'object' && value !== null) {
                                    value = JSON.stringify(value);
                                }

                                // Handle null/undefined
                                if (value === null || value === undefined) {
                                    value = '-';
                                }

                                return (
                                    <td key={cellIndex} className="p-4 text-slate-700">
                                        {value}
                                    </td>
                                );
                            })}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={columns.length} className="p-8 text-center text-slate-500 italic">
                            No records found.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}