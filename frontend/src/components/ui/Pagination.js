// src/components/ui/Pagination.jsx
'use client';

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
    if (!totalPages || totalPages <= 1) return null;

    const startItem = (currentPage - 1) * (itemsPerPage || 10) + 1;
    const endItem = Math.min(currentPage * (itemsPerPage || 10), totalItems || (currentPage * (itemsPerPage || 10)));

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 text-sm text-gray-600 w-full">
            {totalItems !== undefined && (
                <div className="text-xs sm:text-sm font-medium text-gray-500">
                    Showing <span className="font-bold text-gray-800">{startItem}</span> to <span className="font-bold text-gray-800">{endItem}</span> of <span className="font-bold text-gray-800">{totalItems}</span> entries
                </div>
            )}

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                    Previous
                </button>

                <div className="px-3.5 py-2 bg-[#017E84] text-white font-bold text-xs rounded-sm shadow-sm tracking-wide">
                    {currentPage} / {totalPages}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                    Next
                </button>
            </div>
        </div>
    );
}