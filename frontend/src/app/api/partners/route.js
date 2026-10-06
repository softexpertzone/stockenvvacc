import { NextResponse } from 'next/server';
export async function GET() {
    return NextResponse.json({ data: [{ id: 'p1', name: 'Global Supplier' }] });
}