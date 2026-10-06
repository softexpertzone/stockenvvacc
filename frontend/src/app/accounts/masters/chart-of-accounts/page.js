'use client';

import { useEffect, useState } from 'react';
import { groupApi } from '@/features/accounts/api/groupApi';

function TreeNode({ node, level = 0 }) {
    const natureColors = {
        ASSETS: 'bg-blue-50 text-blue-700 border-blue-200',
        LIABILITIES: 'bg-amber-50 text-amber-700 border-amber-200',
        EQUITY: 'bg-purple-50 text-purple-700 border-purple-200',
        INCOME: 'bg-green-50 text-green-700 border-green-200',
        EXPENSES: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
        <div>
            {/* Group Row */}
            <div
                className={`flex items-center gap-3 py-2.5 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    level === 0 ? 'bg-gray-50/60' : ''
                }`}
                style={{ paddingLeft: `${level * 28 + 16}px` }}
            >
                {/* Name */}
                <span className="font-semibold text-sm text-gray-900 min-w-[200px] truncate">
          {node.name}
        </span>

                {/* Code */}
                <span className="text-xs font-mono text-gray-500 w-16 shrink-0">
          {node.code}
        </span>

                {/* Nature Badge */}
                <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide shrink-0 ${
                        natureColors[node.nature] || 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                >
          {node.nature}
        </span>

                {/* Spacer so balance stays right-aligned */}
                <div className="flex-1" />
            </div>

            {/* Ledgers under this group */}
            {node.ledgers?.map((ledger) => (
                <div
                    key={ledger.id}
                    className="flex items-center gap-3 py-1.5 px-4 border-b border-gray-50 hover:bg-blue-50/40 transition-colors text-sm"
                    style={{ paddingLeft: `${(level + 1) * 28 + 16}px` }}
                >
                    {/* Blue indicator */}
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />

                    {/* Ledger Code */}
                    <span className="font-mono text-xs text-gray-500 w-16 shrink-0">
            {ledger.code}
          </span>

                    {/* Ledger Name */}
                    <span className="text-gray-800 flex-1 truncate">{ledger.name}</span>

                    {/* Balance */}
                    <span className="font-mono text-xs text-gray-800 w-28 text-right tabular-nums shrink-0">
            {Number(ledger.currentBalance || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}
          </span>
                </div>
            ))}

            {/* Child Groups (recursive) */}
            {node.children?.map((child) => (
                <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
        </div>
    );
}

export default function ChartOfAccountsPage() {
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        groupApi
            .getTree()
            .then((res) => {
                const data = res?.data?.data ?? res?.data ?? [];
                setTree(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                console.error('Failed to load chart of accounts:', err);
                setTree([]);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Chart of Accounts</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Hierarchical view of account groups and ledgers
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* Column Headers */}
                    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="min-w-[200px]">Account</div>
                        <div className="w-16">Code</div>
                        <div className="w-24">Nature</div>
                        <div className="flex-1" />
                        <div className="w-28 text-right">Balance</div>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-gray-500 text-sm">
                            Loading chart of accounts…
                        </div>
                    ) : tree.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 text-sm">
                            No account groups found. Create groups and ledgers first.
                        </div>
                    ) : (
                        <div>
                            {tree.map((node) => (
                                <TreeNode key={node.id} node={node} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}