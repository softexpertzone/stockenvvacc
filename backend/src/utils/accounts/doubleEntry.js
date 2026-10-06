export const validateDoubleEntry = (entries) => {
    if (!entries || entries.length < 2) {
        throw new Error('Voucher must have at least two entries');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);

        if (debit < 0 || credit < 0) {
            throw new Error('Debit and Credit amounts cannot be negative');
        }
        if (debit > 0 && credit > 0) {
            throw new Error('An entry cannot have both Debit and Credit');
        }
        if (debit === 0 && credit === 0) {
            throw new Error('An entry must have either Debit or Credit');
        }

        totalDebit += debit;
        totalCredit += credit;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Debit and Credit must be equal. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    return true;
};