import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();

        // Proxy the data to your Node.js Backend (the one running on port 5000)
        const response = await fetch('http://localhost:5000/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: "Backend Unreachable: " + error.message }, { status: 502 });
    }
}