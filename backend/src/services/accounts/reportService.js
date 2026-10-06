import prisma from '../../lib/prisma.js'; //[cite: 5]

export const getTrialBalance = async ({ asOnDate, financialYear }) => {
    const ledgers = await prisma.accountLedger.findMany({
        where: { isActive: true },
        include: {
            group: { select: { name: true, nature: true } },
        },
        orderBy: [{ group: { nature: 'asc' } }, { name: 'asc' }],
    });

    const rows = ledgers.map((l) => {
        const balance = Number(l.currentBalance || 0);
        const isDebitNature = l.isDebitBalance; // true = Assets/Expenses, false = Liabilities/Income/Equity

        let debit = 0;
        let credit = 0;

        if (balance !== 0) {
            if (isDebitNature) {
                // Debit-nature account
                if (balance > 0) debit = balance;
                else credit = Math.abs(balance);
            } else {
                // Credit-nature account
                if (balance > 0) credit = balance;
                else debit = Math.abs(balance);
            }
        }

        return {
            ledgerId: l.id,
            code: l.code,
            name: l.name,
            group: l.group?.name || '',
            nature: l.group?.nature || '',
            debit,
            credit,
        };
    });

    const filteredRows = rows.filter((r) => r.debit !== 0 || r.credit !== 0);

    const totalDebit = filteredRows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = filteredRows.reduce((sum, r) => sum + r.credit, 0);

    return {
        asOnDate: asOnDate || new Date(),
        financialYear,
        rows: filteredRows,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
};

export const getProfitAndLoss = async ({ fromDate, toDate, financialYear }) => {
    const whereVoucher = { status: 'POSTED' };
    if (fromDate || toDate) {
        whereVoucher.voucherDate = {};
        if (fromDate) whereVoucher.voucherDate.gte = new Date(fromDate);
        if (toDate) whereVoucher.voucherDate.lte = new Date(toDate + 'T23:59:59.999Z');
    }

    // Aggregate entries by nature within period
    const entries = await prisma.voucherEntry.findMany({
        where: {
            voucher: whereVoucher,
            ledger: {
                group: {
                    nature: { in: ['INCOME', 'EXPENSES'] }
                }
            }
        },
        include: {
            ledger: { select: { id: true, name: true, group: { select: { nature: true } } } }
        }
    });

    const incomeMap = {};
    const expenseMap = {};

    entries.forEach((e) => {
        const nature = e.ledger.group.nature;
        const ledgerName = e.ledger.name;
        // Credit increases Income, Debit decreases Income
        // Debit increases Expense, Credit decreases Expense
        const netAmount = Number(e.credit || 0) - Number(e.debit || 0);

        if (nature === 'INCOME') {
            incomeMap[ledgerName] = (incomeMap[ledgerName] || 0) + netAmount;
        } else if (nature === 'EXPENSES') {
            expenseMap[ledgerName] = (expenseMap[ledgerName] || 0) - netAmount; // flip sign for expense
        }
    });

    const income = Object.entries(incomeMap).map(([name, amount]) => ({ name, amount }));
    const expenses = Object.entries(expenseMap).map(([name, amount]) => ({ name, amount }));

    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return {
        fromDate,
        toDate,
        financialYear,
        income,
        expenses,
        totalIncome,
        totalExpenses,
        netProfit,
    };
};

export const getBalanceSheet = async ({ asOnDate, financialYear }) => {
    // 1. Build date filter for posted vouchers ONLY up to asOnDate
    const voucherWhere = { status: 'POSTED' };
    if (asOnDate) {
        voucherWhere.voucherDate = { lte: new Date(asOnDate + 'T23:59:59.999Z') };
    }

    // 2. Helper to dynamically calculate net movement per ledger based on Normal Balance
    const getBalances = async (nature, normalBalance) => {
        const ledgers = await prisma.accountLedger.findMany({
            where: { isActive: true, group: { nature } },
            include: { group: true },
        });

        const list = [];
        for (const ledger of ledgers) {
            const agg = await prisma.voucherEntry.aggregate({
                where: {
                    ledgerId: ledger.id,
                    voucher: voucherWhere,
                },
                _sum: { debit: true, credit: true },
            });

            const debit = Number(agg._sum.debit || 0);
            const credit = Number(agg._sum.credit || 0);

            // Assets/Expenses increase with Debit. Liabilities/Equity/Income increase with Credit.
            const netAmount = normalBalance === 'DEBIT' ? (debit - credit) : (credit - debit);

            // Filter out exact zero balances to clean up the UI
            if (netAmount !== 0) {
                list.push({
                    name: ledger.name,
                    amount: netAmount,
                });
            }
        }
        return list;
    };

    // 3. Fetch Core Balance Sheet Accounts
    const assets = await getBalances('ASSETS', 'DEBIT');
    const liabilities = await getBalances('LIABILITIES', 'CREDIT');
    const equity = await getBalances('EQUITY', 'CREDIT');

    // 4. Calculate Current Year Profit (Income - Expenses) to roll into Equity
    const income = await getBalances('INCOME', 'CREDIT');
    const expenses = await getBalances('EXPENSES', 'DEBIT');

    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const currentYearProfit = totalIncome - totalExpenses;

    if (currentYearProfit !== 0) {
        equity.push({
            name: 'Current Year Profit / Retained Earnings',
            amount: currentYearProfit
        });
    }

    // 5. Aggregate Totals
    const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
    const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);

    return {
        asOnDate,
        financialYear,
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    };
};

export const getGeneralLedger = async ({ ledgerId, fromDate, toDate }) => { //[cite: 5]
    if (!ledgerId) throw new Error('ledgerId is required'); //[cite: 5]

    const ledger = await prisma.accountLedger.findUnique({ //[cite: 5]
        where: { id: ledgerId }, //[cite: 5]
        include: { group: true }, //[cite: 5]
    }); //[cite: 5]

    if (!ledger) throw new Error('Ledger not found'); //[cite: 5]

    const where = { //[cite: 5]
        ledgerId, //[cite: 5]
        voucher: { status: 'POSTED' }, //[cite: 5]
    }; //[cite: 5]

    if (fromDate || toDate) { //[cite: 5]
        where.voucher = { //[cite: 5]
            ...where.voucher, //[cite: 5]
            voucherDate: {}, //[cite: 5]
        }; //[cite: 5]
        if (fromDate) where.voucher.voucherDate.gte = new Date(fromDate); //[cite: 5]
        if (toDate) where.voucher.voucherDate.lte = new Date(toDate); //[cite: 5]
    } //[cite: 5]

    const entries = await prisma.voucherEntry.findMany({ //[cite: 5]
        where, //[cite: 5]
        include: { //[cite: 5]
            voucher: { //[cite: 5]
                select: { //[cite: 5]
                    id: true, //[cite: 5]
                    voucherNumber: true, //[cite: 5]
                    voucherType: true, //[cite: 5]
                    voucherDate: true, //[cite: 5]
                    narration: true, //[cite: 5]
                }, //[cite: 5]
            }, //[cite: 5]
        }, //[cite: 5]
        orderBy: [{ voucher: { voucherDate: 'asc' } }, { lineNumber: 'asc' }], //[cite: 5]
    }); //[cite: 5]

    return { //[cite: 5]
        ledger: { //[cite: 5]
            id: ledger.id, //[cite: 5]
            name: ledger.name, //[cite: 5]
            code: ledger.code, //[cite: 5]
            openingBalance: ledger.openingBalance, //[cite: 5]
            currentBalance: ledger.currentBalance, //[cite: 5]
        }, //[cite: 5]
        entries, //[cite: 5]
    }; //[cite: 5]
}; //[cite: 5]

export const getVoucherLedger = async ({ voucherType, fromDate, toDate, page = 1, limit = 50 }) => { //[cite: 5]
    const where = { status: 'POSTED' }; //[cite: 5]

    if (voucherType) where.voucherType = voucherType; //[cite: 5]
    if (fromDate || toDate) { //[cite: 5]
        where.voucherDate = {}; //[cite: 5]
        if (fromDate) where.voucherDate.gte = new Date(fromDate); //[cite: 5]
        if (toDate) where.voucherDate.lte = new Date(toDate); //[cite: 5]
    } //[cite: 5]

    const [data, total] = await Promise.all([ //[cite: 5]
        prisma.voucher.findMany({ //[cite: 5]
            where, //[cite: 5]
            include: { //[cite: 5]
                entries: { //[cite: 5]
                    include: { ledger: { select: { name: true, code: true } } }, //[cite: 5]
                }, //[cite: 5]
            }, //[cite: 5]
            orderBy: { voucherDate: 'desc' }, //[cite: 5]
            skip: (page - 1) * limit, //[cite: 5]
            take: limit, //[cite: 5]
        }), //[cite: 5]
        prisma.voucher.count({ where }), //[cite: 5]
    ]); //[cite: 5]

    return { //[cite: 5]
        data, //[cite: 5]
        pagination: { //[cite: 5]
            total, //[cite: 5]
            page, //[cite: 5]
            limit, //[cite: 5]
            totalPages: Math.ceil(total / limit), //[cite: 5]
        }, //[cite: 5]
    }; //[cite: 5]
}; //[cite: 5]

/**
 * Cash Flow Statement (Direct method using Cash / Bank ledgers)
 * FIXED: GR/IR, Accounts Payable, Supplier payments now correctly go to Operating
 */
export const getCashFlow = async ({ fromDate, toDate }) => {
    if (!fromDate || !toDate) {
        throw new Error('fromDate and toDate are required');
    }

    // 1. Find Cash & Bank ledgers
    const cashLedgers = await prisma.accountLedger.findMany({
        where: {
            isActive: true,
            OR: [
                { ledgerType: { in: ['CASH', 'BANK'] } },
                { code: { in: ['1010', '1020', 'CASH', 'BANK'] } },
                { name: { contains: 'Cash', mode: 'insensitive' } },
                { name: { contains: 'Bank', mode: 'insensitive' } },
                { group: { name: { contains: 'Cash', mode: 'insensitive' } } },
                { group: { name: { contains: 'Bank', mode: 'insensitive' } } },
            ],
        },
        select: {
            id: true,
            name: true,
            code: true,
            ledgerType: true,
            currentBalance: true,
            openingBalance: true,
        },
    });

    const cashLedgerIds = cashLedgers.map((l) => l.id);

    if (cashLedgerIds.length === 0) {
        return {
            fromDate,
            toDate,
            operating: [],
            investing: [],
            financing: [],
            netOperating: 0,
            netInvesting: 0,
            netFinancing: 0,
            netCashFlow: 0,
            openingCash: 0,
            closingCash: 0,
            cashLedgers: [],
        };
    }

    // 2. Opening Cash = sum of openingBalance of all Cash/Bank ledgers
    //    + all posted movements before fromDate
    const openingFromLedgers = cashLedgers.reduce(
        (sum, l) => sum + Number(l.openingBalance || 0),
        0
    );

    const openingAgg = await prisma.voucherEntry.aggregate({
        where: {
            ledgerId: { in: cashLedgerIds },
            voucher: {
                status: 'POSTED',
                voucherDate: { lt: new Date(fromDate) },
            },
        },
        _sum: { debit: true, credit: true },
    });

    const openingFromEntries =
        Number(openingAgg._sum.debit || 0) - Number(openingAgg._sum.credit || 0);

    const openingCash = openingFromLedgers + openingFromEntries;

    // 3. Get all posted entries on cash/bank ledgers in the period
    const entries = await prisma.voucherEntry.findMany({
        where: {
            ledgerId: { in: cashLedgerIds },
            voucher: {
                status: 'POSTED',
                voucherDate: {
                    gte: new Date(fromDate),
                    lte: new Date(toDate + 'T23:59:59.999Z'),
                },
            },
        },
        include: {
            voucher: {
                select: {
                    id: true,
                    voucherNumber: true,
                    voucherType: true,
                    voucherDate: true,
                    narration: true,
                    entries: {
                        include: {
                            ledger: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                    ledgerType: true,
                                    group: { select: { name: true, nature: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: [{ voucher: { voucherDate: 'asc' } }],
    });

    const operating = [];
    const investing = [];
    const financing = [];

    // Track processed voucher IDs so we don't double-count Contra
    const processedVouchers = new Set();

    for (const entry of entries) {
        const voucherId = entry.voucher.id;

        // Skip if we already processed this voucher (important for Contra)
        if (processedVouchers.has(voucherId)) continue;

        // Check if this is a pure Contra (both sides are Cash/Bank)
        const allEntries = entry.voucher.entries;
        const cashSideCount = allEntries.filter((e) =>
            cashLedgerIds.includes(e.ledgerId)
        ).length;

        if (cashSideCount === allEntries.length) {
            // Pure Cash ↔ Bank transfer → ignore completely
            processedVouchers.add(voucherId);
            continue;
        }

        // Normal cash movement
        const amount = Number(entry.debit || 0) - Number(entry.credit || 0);
        if (Math.abs(amount) < 0.01) continue;

        const opposite = allEntries.find((e) => !cashLedgerIds.includes(e.ledgerId));

        const nature   = (opposite?.ledger?.group?.nature || 'ASSETS').toUpperCase();
        const oppType  = (opposite?.ledger?.ledgerType   || 'GENERAL').toUpperCase();
        const oppName  = (opposite?.ledger?.name         || '').toUpperCase();
        const oppGroup = (opposite?.ledger?.group?.name  || '').toUpperCase();

        const particular =
            opposite?.ledger?.name || entry.voucher.narration || 'Other';

        const line = {
            date: entry.voucher.voucherDate,
            voucherNumber: entry.voucher.voucherNumber,
            voucherType: entry.voucher.voucherType,
            particular,
            inflow: amount > 0 ? amount : 0,
            outflow: amount < 0 ? Math.abs(amount) : 0,
            net: amount,
        };

        // ---------- FIXED CLASSIFICATION ----------
        // Trade payables / GR-IR / supplier clearing accounts → Operating
        const isTradePayable =
            ['VENDOR', 'SUPPLIER'].includes(oppType) ||
            oppName.includes('GR/IR') ||
            oppName.includes('GRIR') ||
            oppName.includes('GOODS RECEIVED') ||
            oppName.includes('ACCOUNTS PAYABLE') ||
            oppName.includes('TRADE PAYABLE') ||
            oppName.includes('SUPPLIER') ||
            oppGroup.includes('PAYABLE') ||
            oppGroup.includes('GR/IR') ||
            oppGroup.includes('GRIR');

        // Trade receivables / customer accounts → Operating
        const isTradeReceivable =
            ['CUSTOMER', 'DEBTOR'].includes(oppType) ||
            oppName.includes('ACCOUNTS RECEIVABLE') ||
            oppName.includes('TRADE RECEIVABLE') ||
            oppName.includes('CUSTOMER');

        // Income, Expenses, Tax, Stock → Operating
        const isOperatingNature =
            ['INCOME', 'EXPENSES', 'EXPENSE'].includes(nature) ||
            ['TAX', 'STOCK'].includes(oppType);

        // Non-cash Assets (except inventory) → Investing
        const isInvesting =
            ['ASSETS', 'ASSET'].includes(nature) &&
            !['CASH', 'BANK'].includes(oppType) &&
            !isTradePayable &&
            !oppName.includes('INVENTORY');

        // Equity or non-trade Liabilities → Financing
        const isFinancing =
            ['EQUITY'].includes(nature) ||
            (['LIABILITIES', 'LIABILITY'].includes(nature) && !isTradePayable);

        if (isTradePayable || isTradeReceivable || isOperatingNature) {
            operating.push(line);          // ← GR/IR payments now correctly go here
        } else if (isInvesting) {
            investing.push(line);
        } else if (isFinancing) {
            financing.push(line);
        } else {
            // Safe default for anything unknown
            operating.push(line);
        }
        // ---------- END FIXED CLASSIFICATION ----------

        processedVouchers.add(voucherId);
    }

    const sumNet = (arr) => arr.reduce((s, i) => s + i.net, 0);

    const netOperating = sumNet(operating);
    const netInvesting = sumNet(investing);
    const netFinancing = sumNet(financing);
    const netCashFlow = netOperating + netInvesting + netFinancing;
    const closingCash = openingCash + netCashFlow;

    return {
        fromDate,
        toDate,
        operating,
        investing,
        financing,
        netOperating,
        netInvesting,
        netFinancing,
        netCashFlow,
        openingCash,
        closingCash,
        cashLedgers,
    };
};