'use client';
import { useState, useEffect } from 'react';

export default function PartnerTable({ type }) {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const formatName = (str) => {
        if (!str || typeof str !== 'string') return "-";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Ensure your backend is running on port 5000
                const res = await fetch(`http://localhost:5000/api/partners?type=${type}`);

                if (!res.ok) {
                    throw new Error(`Server Error: ${res.status}`);
                }

                const data = await res.json();
                setPartners(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err.message);
                setPartners([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [type]);

    if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Loading records...</div>;

    if (error) return (
        <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
            <p className="font-bold">Failed to load partners</p>
            <p className="text-sm">{error}</p>
        </div>
    );

    return (
        <div className="w-full overflow-x-auto shadow-sm border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                    <th className="px-6 py-4 text-center">Company</th>
                    <th className="px-6 py-4 text-center">Contact</th>
                    <th className="px-6 py-4 text-center">Phone</th>
                    <th className="px-6 py-4 text-center">Balance</th>
                    <th className="px-6 py-4 text-center">Credit Limit</th>
                    <th className="px-6 py-4 text-center hidden md:table-cell">Tax ID</th>
                    <th className="px-6 py-4 text-center hidden md:table-cell">Bank Details</th>
                </tr>
                </thead>

                <tbody className="text-slate-800 divide-y divide-slate-100">
                {partners.length > 0 ? (
                    partners.map((p) => (
                        // FIX: Use unique ID from database, fallback to a stable string or index
                        // Never use Math.random() as a key
                        <tr key={p.id || `partner-${p.companyName}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-900 text-center">{formatName(p.companyName)}</td>
                            <td className="px-6 py-4 text-slate-700 text-center">{formatName(p.name)}</td>
                            <td className="px-6 py-4 font-mono text-sm text-slate-600 text-center">{p.phone || "—"}</td>
                            <td className="px-6 py-4 font-mono font-medium text-slate-900 text-center">
                                ${Number(p.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-600 text-center">
                                ${Number(p.creditLimit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 hidden md:table-cell text-center">{p.taxId || "—"}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-[150px] hidden md:table-cell text-center">{p.bankDetails || "—"}</td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">
                            No records found. Try adding a new partner.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}