'use client';
import { useEffect, useState } from 'react';

export default function TestPage() {
    const [status, setStatus] = useState('Testing...');

    useEffect(() => {
        fetch('http://localhost:5000/api/purchase/orders?status=PENDING')
            .then(res => res.json())
            .then(data => {
                // Peek at the data in the console
                console.log("FULL API RESPONSE:", data);
                setStatus('Check your Browser Console (F12) to see the structure!');
            })
            .catch(err => setStatus('Error: ' + err.message));
    }, []);

    return <h1 className="p-10 text-xl font-bold">{status}</h1>;
}