/**
 * Helper functions for generating accounting reports
 */

/**
 * Group ledgers by their Account Group nature
 */
const groupByNature = (ledgers = []) => {
    const result = {
        ASSETS: [],
        LIABILITIES: [],
        EQUITY: [],
        INCOME: [],
        EXPENSES: [],
    };

    for (const ledger of ledgers) {
        const nature = ledger.group?.nature || ledger.nature;
        if (result[nature]) {
            result[nature].push(ledger);
        }
    }

    return result;
};

/**
 * Calculate total of a list of ledgers (using absolute currentBalance)
 */
const sumBalances = (ledgers = []) => {
    return ledgers.reduce((sum, ledger) => {
        return sum + Math.abs(Number(ledger.currentBalance || 0));
    }, 0);
};

/**
 * Build hierarchical tree structure from flat groups
 * Useful for Chart of Accounts and Balance Sheet presentation
 */
const buildGroupTree = (groups = [], parentId = null) => {
    return groups
        .filter((g) => g.parentId === parentId)
        .map((group) => ({
            ...group,
            children: buildGroupTree(groups, group.id),
            ledgers: group.ledgers || [],
        }));
};

/**
 * Format a report row for Trial Balance / GL
 */
const formatReportRow = (ledger, options = {}) => {
    const balance = Number(ledger.currentBalance || 0);
    const isDebit = ledger.isDebitBalance;

    let debit = 0;
    let credit = 0;

    if (balance !== 0) {
        if (isDebit) {
            if (balance > 0) debit = balance;
            else credit = Math.abs(balance);
        } else {
            if (balance > 0) credit = balance;
            else debit = Math.abs(balance);
        }
    }

    return {
        id: ledger.id,
        code: ledger.code,
        name: ledger.name,
        groupName: ledger.group?.name || '',
        nature: ledger.group?.nature || '',
        debit: Number(debit.toFixed(2)),
        credit: Number(credit.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        ...options,
    };
};

/**
 * Generate period label (e.g. "01-Apr-2025 to 31-Mar-2026")
 */
const getPeriodLabel = (fromDate, toDate) => {
    const format = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    if (fromDate && toDate) {
        return `${format(fromDate)} to ${format(toDate)}`;
    }
    if (toDate) {
        return `As on ${format(toDate)}`;
    }
    return 'All Periods';
};

/**
 * Check if two amounts are equal (with tolerance for floating point)
 */
const isEqual = (a, b, tolerance = 0.01) => {
    return Math.abs(Number(a) - Number(b)) < tolerance;
};

/**
 * Sort ledgers by group nature order (standard accounting order)
 */
const NATURE_ORDER = {
    ASSETS: 1,
    LIABILITIES: 2,
    EQUITY: 3,
    INCOME: 4,
    EXPENSES: 5,
};

const sortByNature = (ledgers = []) => {
    return [...ledgers].sort((a, b) => {
        const natureA = a.group?.nature || a.nature || '';
        const natureB = b.group?.nature || b.nature || '';
        return (NATURE_ORDER[natureA] || 99) - (NATURE_ORDER[natureB] || 99);
    });
};

module.exports = {
    groupByNature,
    sumBalances,
    buildGroupTree,
    formatReportRow,
    getPeriodLabel,
    isEqual,
    sortByNature,
    NATURE_ORDER,
};