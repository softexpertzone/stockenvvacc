"use client";

import React, { useState } from 'react';

/**
 * Helper to safely extract children arrays from the new nested 7-level API response
 */
const getChildren = (node) => {
    return node.zones || node.rooms || node.aisles || node.racks || node.shelves || node.bins || [];
};

/**
 * Helper to recursively calculate aggregate weight capacity metrics
 */
const calculateMetrics = (node) => {
    if (node.maxWeightKg !== undefined) {
        const current = (node.inventoryBalances || []).reduce((sum, bal) => sum + Number(bal.currentKg || 0), 0);
        const max = Number(node.maxWeightKg || 0);
        return { current, max };
    }

    const children = getChildren(node);
    let totalCurrent = 0;
    let totalMax = 0;

    children.forEach(child => {
        const childMetrics = calculateMetrics(child);
        totalCurrent += childMetrics.current;
        totalMax += childMetrics.max;
    });

    return { current: totalCurrent, max: totalMax };
};

/**
 * Dynamic label generator depending on the item data type attributes
 */
const getNodeTypeLabel = (node) => {
    if (node.zones) return "Godown";
    if (node.rooms) return "Zone";
    if (node.aisles) return "Room";
    if (node.racks) return "Aisle";
    if (node.shelves) return "Rack";
    if (node.bins) return "Shelf";
    return "Bin";
};

export default function HierarchyNode({ node, level = 0, onDelete }) {
    // Automatically open the first level, keep deeper levels closed by default
    const [isOpen, setIsOpen] = useState(level === 0);
    const children = getChildren(node);
    const hasChildren = children.length > 0;

    // Compute capacity data metrics
    const { current, max } = calculateMetrics(node);
    const usagePercentage = max > 0 ? (current / max) * 100 : 0;

    // Dynamic alert indicators based on load factors
    let progressColor = "bg-blue-500";
    let textColor = "text-gray-600";

    if (usagePercentage >= 90) {
        progressColor = "bg-red-600";
        textColor = "text-red-600 font-bold";
    } else if (usagePercentage >= 75) {
        progressColor = "bg-amber-500";
        textColor = "text-amber-600 font-semibold";
    }

    const typeLabel = getNodeTypeLabel(node);

    return (
        <div className="w-full select-none my-2">
            {/* Current Node Header */}
            <div
                className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:bg-gray-50 ${hasChildren ? 'cursor-pointer' : ''}`}
                style={{ marginLeft: `${level * 24}px` }}
            >
                <div
                    className="flex items-center space-x-3 flex-grow"
                    onClick={() => hasChildren && setIsOpen(!isOpen)}
                >
                    {hasChildren ? (
                        <span className="text-gray-400 text-xs w-4 text-center">
              {isOpen ? '▼' : '▶'}
            </span>
                    ) : (
                        <span className="w-4 text-gray-300 text-xs text-center">●</span>
                    )}

                    <span className="text-xs uppercase tracking-wider font-bold text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
            {typeLabel}
          </span>
                    <span className="font-semibold text-gray-800">{node.name}</span>
                </div>

                {/* Capacity Tracking & Actions */}
                <div className="flex items-center space-x-6 mt-3 md:mt-0">

                    {/* Capacity Bar */}
                    <div className="flex items-center space-x-3 w-48 lg:w-64">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            />
                        </div>
                        <div className="flex flex-col items-end min-w-[70px]">
              <span className={`text-xs whitespace-nowrap ${textColor}`}>
                {usagePercentage.toFixed(1)}%
              </span>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                {current.toFixed(0)} / {max.toFixed(0)} kg
              </span>
                        </div>
                    </div>

                    {/* Re-integrated Delete Button from your old code */}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevents the accordion from toggling when clicking delete
                                onDelete(node.id, typeLabel);
                            }}
                            className="text-xs font-medium text-gray-400 hover:text-red-600 transition-colors px-2 py-1 hover:bg-red-50 rounded"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Recursive Call: If children exist and accordion is open, render them */}
            {isOpen && hasChildren && (
                <div className="mt-2 border-l-2 border-gray-100 ml-4 pl-2 space-y-1 relative">
                    {children.map((child) => (
                        <HierarchyNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}