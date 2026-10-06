import { NextResponse } from 'next/server';
export async function GET() {
    return NextResponse.json({ data: [{ id: 't1', name: 'VAT 15%' }, { id: 't2', name: 'GST 5%' }] });
}