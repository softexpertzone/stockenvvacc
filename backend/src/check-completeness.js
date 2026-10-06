import prisma from './lib/prisma.js';

async function main() {
    // 1. GRNs vs JV-GRN vouchers
    const grns = await prisma.gRN.findMany({
        select: { id: true, grnNumber: true, receivedAt: true, purchaseOrderId: true }
    });

    const grnVouchers = await prisma.voucher.findMany({
        where: {
            OR: [
                { voucherNumber: { startsWith: 'JV-GRN-' } },
                { narration: { contains: 'Goods Receipt', mode: 'insensitive' } }
            ],
            status: 'POSTED'
        },
        select: { voucherNumber: true, totalDebit: true, narration: true, createdAt: true }
    });

    // 2. Sales Orders that were dispatched vs JV-SALE vouchers
    const dispatchedSales = await prisma.salesOrder.findMany({
        where: {
            status: { in: ['SHIPPED_COMPLETED', 'SHIPPED_UNPAID'] }
        },
        select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true
        }
    });

    const saleVouchers = await prisma.voucher.findMany({
        where: {
            OR: [
                { voucherNumber: { startsWith: 'JV-SALE-' } },
                { narration: { contains: 'Sales & COGS', mode: 'insensitive' } }
            ],
            status: 'POSTED'
        },
        select: { voucherNumber: true, totalDebit: true, narration: true, createdAt: true }
    });

    console.log('========== PURCHASE / GRN ==========');
    console.log(`Total GRNs in Inventory : ${grns.length}`);
    console.log(`Total JV-GRN vouchers   : ${grnVouchers.length}`);
    console.log('GRN Numbers:', grns.map(g => g.grnNumber));
    console.log('JV-GRN Numbers:', grnVouchers.map(v => v.voucherNumber));

    console.log('\n========== SALES ==========');
    console.log(`Dispatched Sales Orders : ${dispatchedSales.length}`);
    console.log(`Total JV-SALE vouchers  : ${saleVouchers.length}`);
    console.log('Invoices:', dispatchedSales.map(s => s.invoiceNumber));
    console.log('JV-SALE Numbers:', saleVouchers.map(v => v.voucherNumber));

    console.log('\n========== SUMMARY ==========');
    console.log(`GRN missing vouchers    : ${grns.length - grnVouchers.length}`);
    console.log(`Sales missing vouchers  : ${dispatchedSales.length - saleVouchers.length}`);

    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});