/**
 * Utility functions for calculating and managing ledger balances
 */

/**
 * Calculate the running balance for a ledger based on its nature
 * @param {number} currentBalance - Current balance of the ledger
 * @param {number} debit - Debit amount
 * @param {number} credit - Credit amount
 * @param {boolean} isDebitBalance - true = Debit nature, false = Credit nature
 * @returns {number} New balance
 */
const calculateNewBalance = (currentBalance, debit = 0, credit = 0, isDebitBalance = true) => {
    const curr = Number(currentBalance) || 0;
    const dr = Number(debit) || 0;
    const cr = Number(credit) || 0;

    if (isDebitBalance) {
        // Debit nature accounts (Assets, Expenses)
        // Debit increases the balance, Credit decreases it
        return curr + dr - cr;
    } else {
        // Credit nature accounts (Liabilities, Income, Equity)
        // Credit increases the balance, Debit decreases it
        return curr + cr - dr;
    }
};

/**
 * Reverse a balance change (used when cancelling a posted voucher)
 */
const reverseBalance = (currentBalance, debit = 0, credit = 0, isDebitBalance = true) => {
    const curr = Number(currentBalance) || 0;
    const dr = Number(debit) || 0;
    const cr = Number(credit) || 0;

    if (isDebitBalance) {
        return curr - dr + cr;
    } else {
        return curr - cr + dr;
    }
};

/**
 * Determine whether a balance should be shown on Debit or Credit side
 * @param {number} balance
 * @param {boolean} isDebitBalance
 * @returns {{ debit: number, credit: number }}
 */
const splitBalance = (balance, isDebitBalance = true) => {
    const amount = Math.abs(Number(balance) || 0);

    if (amount === 0) {
        return { debit: 0, credit: 0 };
    }

    if (isDebitBalance) {
        return Number(balance) >= 0
            ? { debit: amount, credit: 0 }
            : { debit: 0, credit: amount };
    } else {
        return Number(balance) >= 0
            ? { debit: 0, credit: amount }
            : { debit: amount, credit: 0 };
    }
};

/**
 * Calculate total debit and credit from an array of entries
 */
const calculateTotals = (entries = []) => {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
        totalDebit += Number(entry.debit || 0);
        totalCredit += Number(entry.credit || 0);
    }

    return {
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        difference: Number((totalDebit - totalCredit).toFixed(2)),
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
};

/**
 * Format amount with 2 decimal places
 */
const formatAmount = (amount) => {
    return Number(Number(amount || 0).toFixed(2));
};

module.exports = {
    calculateNewBalance,
    reverseBalance,
    splitBalance,
    calculateTotals,
    formatAmount,
};