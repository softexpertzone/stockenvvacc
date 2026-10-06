import prisma from './lib/prisma.js';

async function main() {
    const vouchers = await prisma.voucher.findMany({
        where: {
            OR: [
                { voucherNumber: { startsWith: 'JV-GRN-' } },
                { narration: { contains: 'Goods Receipt', mode: 'insensitive' } },
                { narration: { contains: 'GRN', mode: 'insensitive' } },
            ],
            status: 'POSTED'
        },
        include: {
            entries: {
                include: { ledger: { select: { code: true, name: true } } }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log(JSON.stringify(vouchers, null, 2));
    console.log(`\nTotal GRN-related vouchers: ${vouchers.length}`);
    process.exit(0);
}

main().catch(console.error);