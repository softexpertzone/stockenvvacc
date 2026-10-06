import { NextResponse } from 'next/server';

export async function GET() {
    // Mock data for categories
    const categories = [
        { id: 'cat1', name: 'Raw Materials' },
        { id: 'cat2', name: 'Finished Goods' }
    ];
    return NextResponse.json({ data: categories });
}