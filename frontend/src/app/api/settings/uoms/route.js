import { NextResponse } from 'next/server';
export async function GET() {
    return NextResponse.json({ data: [{ id: 'u1', name: 'Kg' }, { id: 'u2', name: 'Pcs' }] });
}