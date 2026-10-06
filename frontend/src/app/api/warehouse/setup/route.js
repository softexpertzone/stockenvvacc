import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Ensure this is inside backend-erp

export async function GET() {
    try {
        // Fetch nested hierarchy
        const godowns = await prisma.godown.findMany({
            include: {
                rooms: {
                    include: {
                        racks: true
                    }
                }
            }
        });
        return NextResponse.json({ success: true, data: godowns });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch warehouse hierarchy" }, { status: 500 });
    }
}