import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiFetcher';

export default function ProductSearch({ onAddProduct }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);

    // Fetch products whenever the search term changes
    useEffect(() => {
        if (searchTerm.length > 2) {
            apiFetch(`/products?search=${searchTerm}`).then(setResults);
        }
    }, [searchTerm]);

    return (
        <div className="relative p-4">
            <input
                className="w-full p-2 border rounded"
                placeholder="Search product (e.g. Logitech)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {results.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {results.map((product) => (
                        <li
                            key={product.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => onAddProduct(product)}
                        >
                            {product.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}