import prisma from './lib/prisma.js';
import * as balanceService from './services/accounts/balanceService.js';

async function main() {
    const ledgers = await prisma.accountLedger.findMany({
        select: { id: true, code: true, name: true }
    });

    for (const l of ledgers) {
        const newBal = await balanceService.recalculateLedgerBalance(l.id);
        console.log(`${l.code.padEnd(8)} ${l.name.padEnd(25)} → ${newBal}`);
    }

    console.log('\n✅ All ledger balances recalculated from posted vouchers');
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});