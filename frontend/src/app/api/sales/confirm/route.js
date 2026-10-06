import { NextResponse } from 'next/server';
export async function POST(req) {
    try {
        const { items, buyerId, total } = await req.json();

        // Start a Prisma Transaction (ACID compliant)
        const result = await prisma.$transaction(async (tx) => {

            // 1. Create the Sales Order in VALIDATED state
            const order = await tx.salesOrder.create({
                data: {
                    invoiceNumber: `INV-${Date.now()}`,
                    partnerId: buyerId, // The Buyer
                    customerId: "temp-id", // Replace with real customer logic
                    totalAmount: total,
                    status: 'VALIDATED', // Transitioning directly to VALIDATED
                    paymentMethod: 'CASH',
                    items: {
                        create: items.map(item => ({
                            productVariantId: item.productId,
                            quantityCount: item.qty,
                            unitPrice: item.price,
                            totalPrice: item.qty * item.price - (item.discount || 0)
                        }))
                    }
                }
            });

            // 2. Reserve Stock (Deduct from Inventory)
            for (const item of items) {
                const inventory = await tx.inventoryBalance.findFirst({
                    where: { productVariantId: item.productId }
                });

                if (!inventory || inventory.currentCount < item.qty) {
                    throw new Error(`Insufficient stock for ${item.name}`);
                }

                await tx.inventoryBalance.update({
                    where: { id: inventory.id },
                    data: {
                        currentCount: { decrement: item.qty },
                        soldCount: { increment: item.qty }
                    }
                });
            }

            return order;
        });

        return NextResponse.json({ success: true, order: result });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}