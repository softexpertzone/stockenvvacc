import prisma from '../lib/prisma.js';
import { createSalesAccountingEntries } from './accounts/inventoryBridge.js';

/**
 * Physical Outbound Dispatch Engine
 */
    export const dispatchOrderStock = async (salesOrderId, userId) => {
        return await prisma.$transaction(async (tx) => {
            // 1. Fetch the order
            const order = await tx.salesOrder.findUnique({
                where: { id: salesOrderId },
                include: {
                    items: {
                        include: {
                            stockAllocations: {
                                include: { bin: true, batch: true }
                            }
                        }
                    }
                }
            });

            if (!order) throw new Error("Sales Order not found.");
            if (!['ALLOCATED_PENDING', 'ALLOCATED_PAID'].includes(order.status)) {
                throw new Error(`Order cannot be dispatched. Current status is: ${order.status}`);
            }

            let totalCogs = 0;

            // 2. Process stock deduction + calculate real COGS
            for (const item of order.items) {
                if (!item.stockAllocations || item.stockAllocations.length === 0) {
                    throw new Error(`Data Drift Error: No stock allocations found for product variant ${item.productVariantId}`);
                }

                const variantMeta = await tx.productVariant.findUnique({
                    where: { id: item.productVariantId },
                    select: { weightKg: true, volumeCm3: true, sku: true, costPrice: true }
                });

                if (!variantMeta) {
                    throw new Error(`Product variant with ID ${item.productVariantId} was not found.`);
                }

                for (const allocation of item.stockAllocations) {
                    const qtyToDeduct = allocation.allocatedCount;
                    const weightPerUnit = variantMeta.weightKg ? Number(variantMeta.weightKg) : 0;
                    const volumePerUnit = variantMeta.volumeCm3 ? Number(variantMeta.volumeCm3) : 0;
                    const computedKg = qtyToDeduct * weightPerUnit;
                    const computedCm3 = qtyToDeduct * volumePerUnit;

                    const currentBalance = await tx.inventoryBalance.findFirst({
                        where: {
                            productVariantId: item.productVariantId,
                            binId: allocation.binId,
                            batchId: allocation.batchId ?? null
                        }
                    });

                    if (!currentBalance || currentBalance.currentCount < qtyToDeduct) {
                        throw new Error(
                            `Discrepancy Detected: Physical stock in Bin is insufficient for SKU: ${variantMeta.sku}`
                        );
                    }

                    // COGS calculation
                    const unitCost = Number(variantMeta.costPrice || 0);
                    totalCogs += unitCost * qtyToDeduct;

                    // Decrement inventory
                    await tx.inventoryBalance.update({
                        where: { id: currentBalance.id },
                        data: {
                            currentCount: { decrement: qtyToDeduct },
                            allocatedCount: { decrement: qtyToDeduct },
                            lastStockMovement: new Date()
                        }
                    });

                    // Release bin capacity
                    if (allocation.binId) {
                        await tx.bin.update({
                            where: { id: allocation.binId },
                            data: {
                                currentWeight: { decrement: computedKg },
                                currentVolume: { decrement: computedCm3 }
                            }
                        });
                    }

                    // Stock Ledger
                    await tx.stockLedger.create({
                        data: {
                            transactionType: 'OUTBOUND_SALE',
                            productVariantId: item.productVariantId,
                            batchId: allocation.batchId ?? null,
                            binId: allocation.binId,
                            quantity: -Math.abs(qtyToDeduct),
                            referenceId: order.id,
                            referenceType: 'SALES_ORDER',
                            createdById: userId ?? null,
                            notes: `Dispatched via Invoice: ${order.invoiceNumber}`
                        }
                    });
                }
            }

            // 3. Update Sales Order status
            const finalStatus = order.status === 'ALLOCATED_PAID' ? 'SHIPPED_COMPLETED' : 'SHIPPED_UNPAID';

            const finalizedOrder = await tx.salesOrder.update({
                where: { id: salesOrderId },
                data: { status: finalStatus }
            });

            // =====================================================
            // 4. ACCOUNTING BRIDGE – SUPPORTS PARTIAL PAYMENT
            // =====================================================
            try {
                const totalRevenue = Number(order.totalAmount || 0);
                const paidAmount = Number(order.receivedAmount || 0);   // actual money received at checkout
                const dueAmount = Number(
                    order.balanceDue ?? Math.max(0, totalRevenue - paidAmount)
                );

                // Decide Cash vs Bank for ledger selection
                const paymentMethodUpper = (order.paymentMethod || '').toUpperCase();
                const finalPaymentMethod = ['BANK', 'BANK_CHECK'].includes(paymentMethodUpper)
                    ? 'BANK'
                    : 'CASH';

                await createSalesAccountingEntries(tx, {
                    salesOrder: finalizedOrder,
                    userId,
                    totalRevenue,
                    totalCogs,
                    paymentMethod: finalPaymentMethod,
                    paidAmount          // ← critical for partial payment
                });
            } catch (accError) {
                console.error('[dispatchOrderStock] Accounting bridge failed:', accError.message);
            }

            return finalizedOrder;
        });
    };

export const processSalesCheckout = async (payload, userId) => {
    return await prisma.$transaction(async (tx) => {
        const generatedInvoiceNum = payload.invoiceNumber || `INV-${Date.now()}`;
        const generatedOrderRef = `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Better paymentMethod decision
        const isPaid = payload.paymentStatus === 'PAID';
        const paymentMethod = payload.paymentMethod
            || (isPaid ? 'CASH' : 'CREDIT');

        const order = await tx.salesOrder.create({
            data: {
                invoiceNumber: generatedInvoiceNum,
                orderRef: generatedOrderRef,
                partnerId: payload.partnerId || null,
                customerId: payload.customerId || null,
                createdById: userId || null,
                totalAmount: Number(payload.totalAmount || 0),
                paymentMethod: paymentMethod,
                status: isPaid ? 'ALLOCATED_PAID' : 'ALLOCATED_PENDING',
                items: {
                    create: (payload.items || []).map(item => {
                        const qty = Number(item.orderedQuantity);
                        const price = Number(item.unitPrice);
                        return {
                            productVariantId: item.productVariantId,
                            orderedQuantity: qty,
                            unitPrice: price,
                            totalPrice: qty * price
                        };
                    })
                }
            },
            include: { items: true }
        });

        // FIFO Stock Allocation
        for (const orderItem of order.items) {
            let remainingToAllocate = Number(orderItem.orderedQuantity);

            const availableBalances = await tx.inventoryBalance.findMany({
                where: {
                    productVariantId: orderItem.productVariantId,
                    currentCount: { gt: 0 }
                },
                include: { batch: true },
                orderBy: { createdAt: 'asc' }
            });

            for (const balance of availableBalances) {
                if (remainingToAllocate <= 0) break;

                const currentCount = Number(balance.currentCount || 0);
                const allocatedCount = Number(balance.allocatedCount || 0);
                const availableInThisBin = currentCount - allocatedCount;
                if (availableInThisBin <= 0) continue;

                const qtyToTake = Math.min(remainingToAllocate, availableInThisBin);

                await tx.inventoryBalance.update({
                    where: { id: balance.id },
                    data: { allocatedCount: { increment: qtyToTake } }
                });

                await tx.stockAllocation.create({
                    data: {
                        salesOrderItemId: orderItem.id,
                        batchId: balance.batchId ?? null,
                        binId: balance.binId,
                        allocatedCount: qtyToTake
                    }
                });

                remainingToAllocate -= qtyToTake;
            }

            if (remainingToAllocate > 0) {
                throw new Error(
                    `Insufficient stock for Product Variant ID ${orderItem.productVariantId}. Short by ${remainingToAllocate} units.`
                );
            }
        }

        return await tx.salesOrder.findUnique({
            where: { id: order.id },
            include: {
                items: {
                    include: { stockAllocations: true }
                }
            }
        });
    });
};

/**
 * Record partial or full payment/receipt against a Sales Order
 * Mirrors the working partial purchase payment logic
 */

export const recordSalesPartialPayment = async ({
                                                    salesOrderId,
                                                    amount,
                                                    paymentMethod = 'CASH',
                                                    paymentReference = null,
                                                    narration = null,
                                                    userId = null
                                                }) => {
    return await prisma.$transaction(async (tx) => {
        const order = await tx.salesOrder.findUnique({
            where: { id: salesOrderId },
            include: {
                partner: true,
                customer: true,
                items: true
            }
        });

        if (!order) {
            throw new Error('Sales Order not found');
        }

        const currentReceived = Number(order.receivedAmount || 0);
        const totalAmount = Number(order.totalAmount || 0);
        const currentDue = Number(
            order.balanceDue ?? Math.max(0, totalAmount - currentReceived)
        );

        // -------------------------------------------------
        // SAFEGUARD 1: Must have remaining due
        // -------------------------------------------------
        if (currentDue <= 0) {
            throw new Error(
                'This sales order has no remaining due amount. Payment cannot be recorded.'
            );
        }

        // -------------------------------------------------
        // SAFEGUARD 2: Prevent double-counting on pure CASH sales
        // If the order was fully paid as CASH at checkout and
        // already posted to Cash ledger at dispatch, block further payment.
        // -------------------------------------------------
        const originalMethod = (order.paymentMethod || '').toUpperCase();
        const isPureCashSale =
            ['CASH', 'BANK', 'BANK_CHECK', 'CARD'].includes(originalMethod) &&
            currentReceived >= totalAmount - 0.01;

        if (isPureCashSale) {
            throw new Error(
                'This was a fully paid Cash/Bank sale. Revenue was already posted to Cash at dispatch. Additional payment is not allowed.'
            );
        }

        const payAmount = Number(amount);

        if (isNaN(payAmount) || payAmount <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }

        if (payAmount > currentDue + 0.01) {
            throw new Error(
                `Payment amount (${payAmount}) exceeds remaining due (${currentDue.toFixed(2)})`
            );
        }

        const newReceived = Number((currentReceived + payAmount).toFixed(2));
        const newDue = Number(Math.max(0, totalAmount - newReceived).toFixed(2));

        // Update Sales Order financials
        const updatedOrder = await tx.salesOrder.update({
            where: { id: salesOrderId },
            data: {
                receivedAmount: newReceived,
                balanceDue: newDue,
                ...(newDue === 0
                    ? {
                        status: order.status?.includes('SHIPPED')
                            ? 'SHIPPED_COMPLETED'
                            : order.status === 'ALLOCATED_PENDING'
                                ? 'ALLOCATED_PAID'
                                : order.status
                    }
                    : {})
            },
            include: {
                partner: true,
                customer: true,
                items: true
            }
        });

        // Accounting Bridge – Partial / Full Receipt
        const { createSalesReceiptAccountingEntries } = await import(
            './accounts/inventoryBridge.js'
            );

        await createSalesReceiptAccountingEntries(tx, {
            receiptAmount: payAmount,
            salesOrder: updatedOrder,
            paymentMethod: paymentMethod || 'CASH',
            paymentReference,
            userId,
            narration:
                narration ||
                `Partial receipt against Invoice ${order.invoiceNumber || order.orderRef}`
        });

        return {
            order: updatedOrder,
            paidNow: payAmount,
            totalReceived: newReceived,
            remainingDue: newDue
        };
    });
};