import prisma from './lib/prisma.js';

async function inspectInventoryLedger() {
    console.log('\n======================================================');
    console.log('📑 INVENTORY GENERAL LEDGER TRANSACTION DUMP');
    console.log('======================================================\n');

    const inventoryLedger = await prisma.accountLedger.findFirst({
        where: { name: { equals: 'Inventory', mode: 'insensitive' } }
    });

    if (!inventoryLedger) {
        console.log('❌ Inventory ledger not found.');
        return;
    }

    const entries = await prisma.voucherEntry.findMany({
        where: {
            ledgerId: inventoryLedger.id,
            voucher: { status: 'POSTED' }
        },
        include: { voucher: true },
        orderBy: { voucher: { createdAt: 'asc' } }
    });

    let runningBalance = 0;
    console.log('DATE       | VOUCHER NO      | TYPE       | DEBIT (IN)      | CREDIT (OUT)    | BALANCE');
    console.log('-------------------------------------------------------------------------------------------------');

    for (const e of entries) {
        const deb = Number(e.debit || 0);
        const cred = Number(e.credit || 0);
        runningBalance += (deb - cred);

        const date = e.voucher.createdAt ? new Date(e.voucher.createdAt).toISOString().split('T')[0] : 'N/A';
        const vNo = (e.voucher.voucherNumber || 'N/A').padEnd(15);
        const type = (e.voucher.voucherType || e.voucher.type || 'N/A').padEnd(10);
        const dStr = deb > 0 ? '$' + deb.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
        const cStr = cred > 0 ? '$' + cred.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
        const bStr = '$' + runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 });

        console.log(date + ' | ' + vNo + ' | ' + type + ' | ' + dStr.padStart(15) + ' | ' + cStr.padStart(15) + ' | ' + bStr.padStart(15));
    }

    console.log('-------------------------------------------------------------------------------------------------');
    console.log('Ending GL Balance: $' + runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }));
    console.log('Physical Stock   : $3,616,000.00');
    console.log('Variance         : $' + (runningBalance - 3616000).toLocaleString('en-US', { minimumFractionDigits: 2 }) + '\n');
}

inspectInventoryLedger().catch(console.error).finally(() => prisma.$disconnect());