'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

export default function CustomerStatement({ params }) {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        apiClient.get(`/finance/statement/${params.customerId}`).then(res => setOrders(res.data.data));
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Customer Statement</h1>
            <table className="w-full bg-white shadow rounded">
                <thead>
                <tr className="bg-gray-100 border-b">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Paid</th>
                    <th className="p-3">Balance Due</th>
                    <th className="p-3">Status</th>
                </tr>
                </thead>
                <tbody>
                {orders.map(o => (
                    <tr key={o.id} className="border-b">
                        <td className="p-3">{o.invoiceNumber}</td>
                        <td className="p-3">${o.totalAmount}</td>
                        <td className="p-3">${o.receivedAmount}</td>
                        <td className={`p-3 font-bold ${o.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${o.balanceDue}
                        </td>
                        <td className="p-3">
                            {o.balanceDue > 0 && <button className="text-blue-600 underline">Record Payment</button>}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}