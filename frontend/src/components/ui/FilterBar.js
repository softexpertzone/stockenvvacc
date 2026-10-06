'use client';

export default function FilterBar({ searchPlaceholder, onSearch, onFilterChange, selectedFilters, filters, onReset }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Dynamic Filters */}
            {filters.map((filter) => (
                <select
                    key={filter.id}
                    value={selectedFilters[filter.id]}
                    onChange={(e) => onFilterChange(filter.id, e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="ALL">{filter.label}</option>
                    {filter.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            ))}

            {/* Reset Button */}
            <button
                onClick={onReset}
                className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 border border-gray-300 rounded-md transition-colors"
            >
                Reset
            </button>
        </div>
    );
}