'use client';

import AccountSelector from './AccountSelector';

export default function VoucherLineItems({ entries = [], onChange }) {
    const updateEntry = (index, field, value) => {
        const updated = [...entries];
        updated[index] = { ...updated[index], [field]: value };

        // Clear the opposite side when one is entered
        if (field === 'debit' && Number(value) > 0) updated[index].credit = 0;
        if (field === 'credit' && Number(value) > 0) updated[index].debit = 0;

        onChange(updated);
    };

    const addRow = () => {
        onChange([...entries, { ledgerId: '', debit: 0, credit: 0, notes: '' }]);
    };

    const removeRow = (index) => {
        if (entries.length <= 2) return; // minimum 2 rows
        onChange(entries.filter((_, i) => i !== index));
    };

    const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01;

    return (
        <div className="space-y-4">
            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-10">
                            #
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[240px]">
                            Account
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                            Debit
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                            Credit
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[160px]">
                            Notes
                        </th>
                        <th className="px-3 py-2.5 w-12"></th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 bg-white">
                    {entries.map((entry, index) => (
                        <tr
                            key={index}
                            className="hover:bg-blue-50/50 transition-colors"
                        >
                            {/* Row number */}
                            <td className="px-3 py-2 text-gray-500 font-medium text-center">
                                {index + 1}
                            </td>

                            {/* Account */}
                            <td className="px-3 py-2">
                                <AccountSelector
                                    value={entry.ledgerId}
                                    onChange={(val) => updateEntry(index, 'ledgerId', val)}
                                />
                            </td>

                            {/* Debit */}
                            <td className="px-3 py-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={entry.debit || ''}
                                    onChange={(e) => updateEntry(index, 'debit', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-right text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 tabular-nums"
                                    placeholder="0.00"
                                />
                            </td>

                            {/* Credit */}
                            <td className="px-3 py-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={entry.credit || ''}
                                    onChange={(e) => updateEntry(index, 'credit', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-right text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 tabular-nums"
                                    placeholder="0.00"
                                />
                            </td>

                            {/* Notes */}
                            <td className="px-3 py-2">
                                <input
                                    type="text"
                                    value={entry.notes || ''}
                                    onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Optional notes..."
                                />
                            </td>

                            {/* Remove */}
                            <td className="px-3 py-2 text-center">
                                <button
                                    type="button"
                                    onClick={() => removeRow(index)}
                                    disabled={entries.length <= 2}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title={entries.length <= 2 ? 'Minimum 2 lines required' : 'Remove line'}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>

                    {/* Totals footer */}
                    <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-medium">
                        <td colSpan={2} className="px-3 py-3 text-right text-sm text-gray-700">
                            Total
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900 tabular-nums font-semibold">
                            {totalDebit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900 tabular-nums font-semibold">
                            {totalCredit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </td>
                        <td colSpan={2} className="px-3 py-3">
                            {isBalanced ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Balanced
                                    </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        Diff: {difference.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                                    </span>
                            )}
                        </td>
                    </tr>
                    </tfoot>
                </table>
            </div>

            {/* Add Line button */}
            <div>
                <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Line
                </button>
            </div>
        </div>
    );
}