import { NextResponse } from 'next/server';

export async function GET() {
    // In a real system, you query your DB here (e.g., Prisma)
    const mockData = [
        { id: 1, name: 'Color', values: [{ id: 'c1', value: 'Red', label: 'Red' }, { id: 'c2', value: 'Blue', label: 'Blue' }] },
        { id: 2, name: 'Size', values: [{ id: 's1', value: 'S', label: 'Small' }, { id: 's2', value: 'M', label: 'Medium' }] }
    ];
    return NextResponse.json({ success: true, data: mockData });
}