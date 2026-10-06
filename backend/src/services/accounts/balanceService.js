import prisma from '../../lib/prisma.js';

/**
 * Update ledger balances when a voucher is posted
 */
export const updateBalancesOnPost = async (tx, entries) => {
    for (const entry of entries) {
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);

        const ledger = await tx.accountLedger.findUnique({
            where: { id: entry.ledgerId },
        });

        if (!ledger) throw new Error(`Ledger not found: ${entry.ledgerId}`);

        let newBalance = Number(ledger.currentBalance);

        if (ledger.isDebitBalance) {
            // Debit nature: Debit increases, Credit decreases
            newBalance = newBalance + debit - credit;
        } else {
            // Credit nature: Credit increases, Debit decreases
            newBalance = newBalance + credit - debit;
        }

        await tx.accountLedger.update({
            where: { id: entry.ledgerId },
            data: { currentBalance: newBalance },
        });
    }
};

/**
 * Reverse ledger balances when a posted voucher is cancelled
 */
export const reverseBalancesOnCancel = async (tx, entries) => {
    for (const entry of entries) {
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);

        const ledger = await tx.accountLedger.findUnique({
            where: { id: entry.ledgerId },
        });

        if (!ledger) throw new Error(`Ledger not found: ${entry.ledgerId}`);

        let newBalance = Number(ledger.currentBalance);

        if (ledger.isDebitBalance) {
            // Reverse: Debit decreases, Credit increases
            newBalance = newBalance - debit + credit;
        } else {
            newBalance = newBalance - credit + debit;
        }

        await tx.accountLedger.update({
            where: { id: entry.ledgerId },
            data: { currentBalance: newBalance },
        });
    }
};

/**
 * Recalculate current balance of a ledger from opening + all posted entries
 * (useful for data repair)
 */
export const recalculateLedgerBalance = async (ledgerId) => {
    const ledger = await prisma.accountLedger.findUnique({ where: { id: ledgerId } });
    if (!ledger) throw new Error('Ledger not found');

    const entries = await prisma.voucherEntry.findMany({
        where: {
            ledgerId,
            voucher: { status: 'POSTED' },
        },
    });

    let balance = Number(ledger.openingBalance);

    for (const entry of entries) {
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);

        if (ledger.isDebitBalance) {
            balance = balance + debit - credit;
        } else {
            balance = balance + credit - debit;
        }
    }

    await prisma.accountLedger.update({
        where: { id: ledgerId },
        data: { currentBalance: balance },
    });

    return balance;
};