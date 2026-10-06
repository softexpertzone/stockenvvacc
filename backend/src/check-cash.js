import prisma from './lib/prisma.js';

async function main() {
    const cashEntries = await prisma.voucherEntry.findMany({
        where: {
            ledger: {
                OR: [
                    { code: { in: ['1010', '1020', 'CASH', 'BANK'] } },
                    { name: { contains: 'Cash', mode: 'insensitive' } },
                    { name: { contains: 'Bank', mode: 'insensitive' } },
                    { ledgerType: { in: ['CASH', 'BANK'] } }
                ]
            },
            voucher: { status: 'POSTED' }
        },
        include: {
            ledger: { select: { code: true, name: true } },
            voucher: {
                select: {
                    voucherNumber: true,
                    voucherType: true,
                    voucherDate: true,
                    narration: true
                }
            }
        },
        take: 20
    });

    console.log('=== Cash / Bank related voucher entries ===');
    console.log(JSON.stringify(cashEntries, null, 2));
    console.log(`\nTotal found: ${cashEntries.length}`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});