import prisma from '../lib/prisma.js';
import {
    createPurchasePaymentAccountingEntries,
    // createSalesReceiptAccountingEntries – must exist in inventoryBridge
} from './accounts/inventoryBridge.js';

// Dynamic import fallback if createSalesReceiptAccountingEntries is missing at load time
async function getSalesReceiptBridge() {
    try {
        const bridge = await import('./accounts/inventoryBridge.js');
        if (typeof bridge.createSalesReceiptAccountingEntries === 'function') {
            return bridge.createSalesReceiptAccountingEntries;
        }
    } catch (_) {
        /* ignore */
    }
    return null;
}

/**
 * Record a vendor (purchase) payment – full or partial
 */
export async function recordVendorPayment({
                                              poId,
                                              amountPaid,
                                              paymentMethod = 'CASH',
                                              paymentReference = null,
                                              notes = null,
                                              userId = null,
                                          }) {
    return await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({ where: { id: poId } });
        if (!po) throw new Error('Purchase Order not found');

        const paid = Number(amountPaid);
        if (isNaN(paid) || paid <= 0) {
            throw new Error('amountPaid must be a positive number');
        }

        const currentDue = Number(po.dueAmount ?? po.grandTotal ?? po.totalAmount ?? 0);
        if (paid > currentDue + 0.01) {
            throw new Error(`Cannot pay more than outstanding due (${currentDue})`);
        }

        const newPaidAmount = Number(po.paidAmount || 0) + paid;
        const newDueAmount = Math.max(0, currentDue - paid);
        const newStatus = newDueAmount <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

        const updatedPO = await tx.purchaseOrder.update({
            where: { id: poId },
            data: {
                paidAmount: newPaidAmount,
                dueAmount: newDueAmount,
                paymentStatus: newStatus,
            },
        });

        let accountingVoucher = null;
        try {
            accountingVoucher = await createPurchasePaymentAccountingEntries(tx, {
                paymentAmount: paid,
                purchaseOrder: po,
                paymentMethod,
                paymentReference,
                userId,
                narration: notes || `Vendor payment for PO ${po.purchaseNumber}`,
            });
        } catch (accErr) {
            console.error('[recordVendorPayment] Accounting bridge failed:', accErr.message);
        }

        if (accountingVoucher) {
            await tx.voucher.update({
                where: { id: accountingVoucher.id },
                data: {
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: poId,
                },
            });

            await tx.paymentAllocation.create({
                data: {
                    voucherId: accountingVoucher.id,
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: poId,
                    allocatedAmount: paid,
                    notes: notes || null,
                },
            });
        }

        await tx.transaction.create({
            data: {
                partnerId: po.partnerId,
                type: 'PURCHASE',
                amount: paid,
                paymentMethod:
                    paymentMethod === 'BANK' || paymentMethod === 'BANK_CHECK'
                        ? 'BANK_CHECK'
                        : 'CASH',
                purchaseOrderId: poId,
                notes: notes || `Payment against PO ${po.purchaseNumber}`,
            },
        });

        return {
            purchaseOrder: updatedPO,
            accountingVoucher,
            paidNow: paid,
            remainingDue: newDueAmount,
        };
    });
}

/**
 * Record a customer (sales) receipt – full or partial
 */
export async function recordCustomerReceipt({
                                                salesOrderId,
                                                amountReceived,
                                                paymentMethod = 'CASH',
                                                paymentReference = null,
                                                notes = null,
                                                userId = null,
                                            }) {
    return await prisma.$transaction(async (tx) => {
        const so = await tx.salesOrder.findUnique({ where: { id: salesOrderId } });
        if (!so) throw new Error('Sales Order not found');

        const received = Number(amountReceived);
        if (isNaN(received) || received <= 0) {
            throw new Error('amountReceived must be a positive number');
        }

        const currentDue = Number(so.balanceDue ?? so.totalAmount ?? 0);
        if (received > currentDue + 0.01) {
            throw new Error(
                `Cannot receive more than outstanding balance (${currentDue})`
            );
        }

        const newReceivedAmount = Number(so.receivedAmount || 0) + received;
        const newBalanceDue = Math.max(0, currentDue - received);

        const updatedSO = await tx.salesOrder.update({
            where: { id: salesOrderId },
            data: {
                receivedAmount: newReceivedAmount,
                balanceDue: newBalanceDue,
            },
        });

        let accountingVoucher = null;
        try {
            const createSalesReceipt = await getSalesReceiptBridge();
            if (createSalesReceipt) {
                accountingVoucher = await createSalesReceipt(tx, {
                    receiptAmount: received,
                    salesOrder: so,
                    paymentMethod,
                    paymentReference,
                    userId,
                    narration:
                        notes ||
                        `Customer receipt for Invoice ${so.invoiceNumber}`,
                });
            } else {
                console.warn(
                    '[recordCustomerReceipt] createSalesReceiptAccountingEntries not found – skipping accounting voucher'
                );
            }
        } catch (accErr) {
            console.error(
                '[recordCustomerReceipt] Accounting bridge failed:',
                accErr.message
            );
        }

        if (accountingVoucher) {
            await tx.voucher.update({
                where: { id: accountingVoucher.id },
                data: {
                    referenceType: 'SALES_ORDER',
                    referenceId: salesOrderId,
                },
            });

            await tx.paymentAllocation.create({
                data: {
                    voucherId: accountingVoucher.id,
                    referenceType: 'SALES_ORDER',
                    referenceId: salesOrderId,
                    allocatedAmount: received,
                    notes: notes || null,
                },
            });
        }

        // Keep Payment table in sync if model exists
        try {
            await tx.payment.create({
                data: {
                    salesOrderId,
                    amount: received,
                    paymentMethod:
                        paymentMethod === 'BANK' || paymentMethod === 'BANK_CHECK'
                            ? 'BANK_CHECK'
                            : 'CASH',
                    notes: notes || null,
                    voucherId: accountingVoucher?.id || null,
                },
            });
        } catch (payErr) {
            console.warn('[recordCustomerReceipt] payment.create skipped:', payErr.message);
        }

        if (so.partnerId) {
            await tx.transaction.create({
                data: {
                    partnerId: so.partnerId,
                    type: 'SALE',
                    amount: received,
                    paymentMethod:
                        paymentMethod === 'BANK' || paymentMethod === 'BANK_CHECK'
                            ? 'BANK_CHECK'
                            : 'CASH',
                    salesOrderId,
                    notes:
                        notes ||
                        `Receipt against Invoice ${so.invoiceNumber}`,
                },
            });
        }

        return {
            salesOrder: updatedSO,
            accountingVoucher,
            receivedNow: received,
            remainingDue: newBalanceDue,
        };
    });
}

/**
 * Transaction history for a specific Purchase Order or Sales Order
 */
export async function getPaymentHistory(referenceType, referenceId) {
    return prisma.paymentAllocation.findMany({
        where: { referenceType, referenceId },
        include: {
            voucher: {
                select: {
                    id: true,
                    voucherNumber: true,
                    voucherType: true,
                    voucherDate: true,
                    narration: true,
                    totalDebit: true,
                    status: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });
}

/**
 * Customer / Vendor statement
 */
export async function getPartnerStatement(partnerId) {
    const [purchaseOrders, salesOrders, transactions] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where: { partnerId },
            select: {
                id: true,
                purchaseNumber: true,
                totalAmount: true,
                paidAmount: true,
                dueAmount: true,
                paymentStatus: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.salesOrder.findMany({
            where: { partnerId },
            select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                receivedAmount: true,
                balanceDue: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.transaction.findMany({
            where: { partnerId },
            orderBy: { date: 'desc' },
            take: 100,
        }),
    ]);

    return { purchaseOrders, salesOrders, transactions };
}