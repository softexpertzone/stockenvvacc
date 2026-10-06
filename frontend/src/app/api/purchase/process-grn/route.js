import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();
        const authHeader = req.headers.get('authorization');

        // Forward the request to your backend
        const backendRes = await fetch('http://localhost:5000/api/purchase/process-grn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader || '',
            },
            body: JSON.stringify(body),
        });

        // Get the response from backend
        const data = await backendRes.json();

        // Return it to the frontend
        return NextResponse.json(data, {
            status: backendRes.status
        });

    } catch (error) {
        console.error("GRN Proxy Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to process GRN"
        }, { status: 500 });
    }
}