// src/app/api/sales/new/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();
        const { partnerId, customerId, items, totalAmount } = body;

        // 1. Transactional Creation: Odoo-style Document Initialization
        const newOrder = await prisma.salesOrder.create({
            data: {
                invoiceNumber: `INV-${Date.now()}`, // Simple invoice generator
                partnerId,
                customerId,
                totalAmount,
                status: 'DRAFT', // Always starts as DRAFT
                paymentMethod: 'CASH', // Default or from body
                items: {
                    create: items.map(item => ({
                        productVariantId: item.productVariantId,
                        quantityCount: item.quantityCount,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice
                    }))
                }
            }
        });

        // 2. Audit Log: Essential for ERP traceability
        await prisma.auditLog.create({
            data: {
                entityId: newOrder.id,
                action: 'ORDER_CREATED',
                userId: 'SYSTEM', // You can replace this with actual session user ID
                reason: 'Initial Draft Creation'
            }
        });

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error) {
        console.error("Order creation error:", error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}