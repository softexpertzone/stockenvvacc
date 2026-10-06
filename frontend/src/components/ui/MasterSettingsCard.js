'use client';
import { useState } from 'react';

export default function MasterSettingsCard({ title, items, endpoint, onAdd }) {
    const [name, setName] = useState('');
    const [value, setValue] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = title.includes('Tax') ? { name, percentage: value } : { name, symbol: value };

        await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setName(''); setValue('');
        onAdd(); // Refresh list
    };

    return (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-lg font-bold mb-4">{title}</h2>
            <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
                <input placeholder="Name" className="border p-2 w-full" value={name} onChange={e => setName(e.target.value)} required />
                <input placeholder={title.includes('Tax') ? "Rate %" : "Symbol"} className="border p-2 w-24" value={value} onChange={e => setValue(e.target.value)} required />
                <button type="submit" className="bg-blue-600 text-white px-4 rounded">Add</button>
            </form>
            <ul className="space-y-2">
                {items.map((item) => (
                    <li key={item.id} className="border-b pb-1 text-sm flex justify-between">
                        <span>{item.name}</span>
                        <span className="font-mono text-gray-500">{item.symbol || `${item.percentage}%`}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}