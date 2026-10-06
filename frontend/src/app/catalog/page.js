'use client';
import { useState } from 'react';
import { useCatalog } from '@/features/catalog/hooks/useCatalog';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from '@/components/ui/Toast';

export default function CatalogPage() {
    const { data, isLoading, error, addCategory } = useCatalog();
    const [newCategory, setNewCategory] = useState({ name: '', description: '' });
    const [toast, setToast] = useState({ message: '', type: 'success' });

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newCategory.name.trim()) {
            setToast({ message: 'Category name is required', type: 'error' });
            return;
        }

        const result = await addCategory(newCategory);
        if (result.success) {
            setNewCategory({ name: '', description: '' });
            setToast({ message: 'Category added successfully', type: 'success' });
        } else {
            setToast({
                message: result.error || 'Failed to add category',
                type: 'error'
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#f9fafb] text-[#374151] font-sans antialiased w-full pb-12 overflow-x-hidden">

            {/* Soft Toast */}
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: 'success' })}
            />

            {/* Header Bar */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center w-full relative z-20 shadow-sm">
                <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 tracking-tight flex items-center gap-2 truncate">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-[#017E84] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="truncate">Catalog Management</span>
                </h1>
            </div>

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 w-full space-y-6">

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-sm border border-red-200 text-sm font-medium break-words shadow-sm">
                        {error}
                    </div>
                )}

                {/* Add Category Form Card */}
                <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full relative">
                    <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0"></div>

                    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
                        <h3 className="font-bold text-gray-800 text-xs sm:text-sm uppercase tracking-wider mb-4">Add New Category</h3>

                        <form onSubmit={handleCreate} className="flex flex-col xl:flex-row gap-4">
                            <input
                                placeholder="Category Name"
                                className="border border-gray-300 rounded-sm p-3 flex-1 bg-gray-50 text-gray-900 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84] transition-all w-full truncate"
                                value={newCategory.name}
                                onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                            />
                            <input
                                placeholder="Description"
                                className="border border-gray-300 rounded-sm p-3 flex-1 bg-gray-50 text-gray-900 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-[#017E84] focus:border-[#017E84] transition-all w-full truncate"
                                value={newCategory.description}
                                onChange={e => setNewCategory({...newCategory, description: e.target.value})}
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-[#017E84] hover:bg-[#01696e] text-white px-6 py-3 rounded-sm font-bold text-xs sm:text-sm tracking-wider uppercase transition-colors shadow-sm disabled:bg-gray-300 disabled:text-gray-500 flex items-center justify-center gap-2 shrink-0 w-full xl:w-auto"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Add Category</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Catalog Data Section */}
                <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden w-full relative">
                    <div className="h-1 bg-[#017E84] w-full absolute top-0 left-0"></div>

                    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
                        {isLoading ? (
                            <div className="py-12 flex justify-center">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto max-w-full">
                                <div className="min-w-[600px] sm:min-w-full">
                                    <DataTable columns={['ID', 'Name', 'Description']} data={data} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}