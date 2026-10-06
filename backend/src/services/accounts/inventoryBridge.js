import prisma from '../../lib/prisma.js';
import { validateDoubleEntry } from '../../utils/accounts/doubleEntry.js';
import * as balanceService from './balanceService.js';

/**
 * Computes dynamic financial year (e.g., "2025-26") based on standard April-March cycle
 */
const getFinancialYear = (date = new Date()) => {
    const year = date.getFullYear();
    const startYear = date.getMonth() >= 3 ? year : year - 1;
    return `${startYear}-${(startYear + 1).toString().slice(-2)}`;
};

/**
 * Safely rounds to 2 decimal places to prevent IEEE 754 precision bugs in JS
 */
const roundCurrency = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

/**
 * Check if Accounts module is enabled
 */
export const isAccountsModuleEnabled = async (tx = prisma) => {
    const setting = await tx.systemSetting.findUnique({
        where: { key: 'module_accounts' },
    });
    return setting?.value === 'true';
};

/**
 * Find ledger by code or name (case-insensitive)
 */
const findLedger = async (tx, { code, name }) => {
    if (code) {
        const byCode = await tx.accountLedger.findFirst({
            where: { code: { equals: code, mode: 'insensitive' } },
        });
        if (byCode) return byCode;
    }
    if (name) {
        const byName = await tx.accountLedger.findFirst({
            where: { name: { contains: name, mode: 'insensitive' } },
        });
        if (byName) return byName;
    }
    return null;
};

/**
 * Create Sales + COGS accounting entries at the moment of Dispatch
 * Industry-standard: supports partial payment at invoice time
 */
export const createSalesAccountingEntries = async (tx, {
    salesOrder,
    userId,
    totalRevenue,
    totalCogs,
    paymentMethod = 'CASH',
    paidAmount = 0
}) => {
    const enabled = await isAccountsModuleEnabled(tx);
    if (!enabled) return null;

    const revAmount = roundCurrency(totalRevenue);
    const cogsAmount = roundCurrency(totalCogs);
    const paid = roundCurrency(paidAmount);
    const due = roundCurrency(Math.max(0, revAmount - paid));

    if (revAmount <= 0 && cogsAmount <= 0) {
        console.warn('[inventoryBridge] Zero value dispatch – skipping accounting entries');
        return null;
    }

    // ---- Resolve Ledgers ----
    const salesLedger = await findLedger(tx, { name: 'Sales', code: 'SALES' })
        || await findLedger(tx, { name: 'Sales Revenue', code: '4010' });

    const cogsLedger = await findLedger(tx, { name: 'Cost of Goods Sold', code: 'COGS' })
        || await findLedger(tx, { name: 'COGS' });

    const inventoryLedger = await findLedger(tx, { name: 'Inventory', code: 'INV' })
        || await findLedger(tx, { name: 'Stock' });

    // Single source of truth for receivables
    const arLedger = await findLedger(tx, { name: 'Accounts Receivable', code: 'AR' })
        || await findLedger(tx, { name: 'Debtors', code: 'DEBTORS' })
        || await findLedger(tx, { name: 'Customer' });

    // Cash / Bank
    const isBank = ['BANK', 'BANK_CHECK'].includes((paymentMethod || '').toUpperCase());
    const cashOrBankLedger = isBank
        ? (await findLedger(tx, { name: 'Bank', code: 'BANK' })
            || await findLedger(tx, { name: 'Primary Bank Account', code: '1020' })
            || await findLedger(tx, { name: 'Cash', code: 'CASH' }))
        : (await findLedger(tx, { name: 'Cash', code: 'CASH' })
            || await findLedger(tx, { name: 'Cash in Hand', code: '1010' })
            || await findLedger(tx, { name: 'Bank', code: 'BANK' }));

    if (!salesLedger || !cogsLedger || !inventoryLedger || !arLedger) {
        console.warn('[inventoryBridge] Missing required ledgers – skipping accounting entries');
        return null;
    }

    if (paid > 0 && !cashOrBankLedger) {
        console.warn('[inventoryBridge] Paid amount > 0 but Cash/Bank ledger not found');
        return null;
    }

    const voucherNumber = `JV-SALE-${salesOrder.invoiceNumber || salesOrder.id.slice(-6)}`;
    const narration = `Sales & COGS for Invoice ${salesOrder.invoiceNumber || salesOrder.orderRef}`;

    const entries = [];

    // ========== REVENUE SIDE ==========
    if (revAmount > 0) {
        // Portion received now
        if (paid > 0) {
            entries.push({
                ledgerId: cashOrBankLedger.id,
                debit: paid,
                credit: 0,
                notes: isBank ? 'Bank received at sale' : 'Cash received at sale'
            });
        }

        // Remaining due
        if (due > 0) {
            entries.push({
                ledgerId: arLedger.id,
                debit: due,
                credit: 0,
                notes: 'Accounts Receivable (Due)'
            });
        }

        // Full sales value
        entries.push({
            ledgerId: salesLedger.id,
            debit: 0,
            credit: revAmount,
            notes: 'Sales Revenue'
        });
    }

    // ========== COST SIDE ==========
    if (cogsAmount > 0) {
        entries.push(
            { ledgerId: cogsLedger.id, debit: cogsAmount, credit: 0, notes: 'Cost of Goods Sold' },
            { ledgerId: inventoryLedger.id, debit: 0, credit: cogsAmount, notes: 'Inventory reduction' }
        );
    }

    validateDoubleEntry(entries);

    const totalDebit = roundCurrency(entries.reduce((s, e) => s + e.debit, 0));
    const totalCredit = roundCurrency(entries.reduce((s, e) => s + e.credit, 0));

    const voucher = await tx.voucher.create({
        data: {
            voucherNumber,
            voucherType: 'JOURNAL',
            voucherDate: new Date(),
            financialYear: getFinancialYear(),
            narration,
            status: 'POSTED',
            totalDebit,
            totalCredit,
            createdById: userId || null,
            referenceType: 'SALES_ORDER',
            referenceId: salesOrder.id,
            entries: {
                create: entries.map((e, idx) => ({
                    lineNumber: idx + 1,
                    ledgerId: e.ledgerId,
                    debit: e.debit,
                    credit: e.credit,
                    notes: e.notes || null,
                })),
            },
        },
        include: {
            entries: { include: { ledger: true } },
        },
    });

    await balanceService.updateBalancesOnPost(tx, voucher.entries);

    console.log(`[inventoryBridge] Sales posted → ${voucher.voucherNumber} | Paid: ${paid} | Due: ${due} | Revenue: ${revAmount}`);
    return voucher;
};
/**
 * Create Purchase / GRN accounting entries at the moment of Goods Receipt
 */
export const createGRNAccountingEntries = async (tx, {
    grn,
    purchaseOrder,
    items,
    totalValue,
    userId
}) => {
    const enabled = await isAccountsModuleEnabled(tx);
    if (!enabled) {
        console.log('[inventoryBridge] Accounts module is OFF – skipping GRN accounting');
        return null;
    }

    const amount = roundCurrency(totalValue);

    if (amount <= 0) {
        console.warn('[inventoryBridge] Zero value GRN – skipping accounting entries');
        return null;
    }

    const inventoryLedger = await findLedger(tx, { code: 'INV', name: 'Inventory' })
        || await findLedger(tx, { name: 'Stock' })
        || await findLedger(tx, { code: 'STOCK' });

    // Prefer GR/IR if exists, otherwise go directly to Accounts Payable
    let creditLedger = await findLedger(tx, { code: 'GRIR', name: 'GR/IR' })
        || await findLedger(tx, { name: 'Goods Received Not Invoiced' })
        || await findLedger(tx, { name: 'GRNI' })
        || await findLedger(tx, { code: 'AP', name: 'Accounts Payable' })
        || await findLedger(tx, { code: '2010', name: 'Accounts Payable' })
        || await findLedger(tx, { name: 'Creditors' });

    if (!inventoryLedger || !creditLedger) {
        console.error('[inventoryBridge] Missing required ledgers for GRN');
        console.error('  Inventory found:', !!inventoryLedger);
        console.error('  Credit ledger found:', !!creditLedger);
        return null;
    }

    const voucherNumber = `JV-GRN-${grn.grnNumber || Date.now().toString().slice(-6)}`;
    const narration = `Goods Receipt ${grn.grnNumber} against PO ${purchaseOrder?.poNumber || purchaseOrder?.purchaseNumber || purchaseOrder?.id || ''}`;

    const entries = [
        {
            ledgerId: inventoryLedger.id,
            debit: amount,
            credit: 0,
            notes: 'Inventory increase from GRN',
        },
        {
            ledgerId: creditLedger.id,
            debit: 0,
            credit: amount,
            notes: creditLedger.code === 'GRIR' || (creditLedger.name || '').includes('GR')
                ? 'GR/IR Clearing'
                : 'Accounts Payable / Creditors',
        },
    ];

    validateDoubleEntry(entries);

    const totalDebit = roundCurrency(entries.reduce((s, e) => s + e.debit, 0));
    const totalCredit = roundCurrency(entries.reduce((s, e) => s + e.credit, 0));

    const voucher = await tx.voucher.create({
        data: {
            voucherNumber,
            voucherType: 'JOURNAL',
            voucherDate: new Date(),
            financialYear: getFinancialYear(),
            narration,
            status: 'POSTED',
            totalDebit,
            totalCredit,
            createdById: userId || null,
            referenceType: 'GRN',
            referenceId: grn.id,

            entries: {
                create: entries.map((e, idx) => ({
                    lineNumber: idx + 1,
                    ledgerId: e.ledgerId,
                    debit: e.debit,
                    credit: e.credit,
                    notes: e.notes || null,
                })),
            },
        },
        include: {
            entries: { include: { ledger: true } },
        },
    });

    await balanceService.updateBalancesOnPost(tx, voucher.entries);

    console.log(`[inventoryBridge] GRN accounting posted → ${voucher.voucherNumber} | Amount: ${amount}`);
    return voucher;
};

/**
 * Create Purchase Payment accounting entries (full or partial)
 * Dr Accounts Payable / Creditors / GR-IR
 * Cr Cash / Bank
 */
export const createPurchasePaymentAccountingEntries = async (tx, {
    paymentAmount,
    totalDueAmount = null,
    purchaseOrder = null,
    grn = null,
    paymentMethod = 'CASH',
    paymentReference = null,
    userId = null,
    narration = null
}) => {
    const enabled = await isAccountsModuleEnabled(tx);
    if (!enabled) {
        console.log('[inventoryBridge] Accounts module is OFF – skipping purchase payment accounting');
        return null;
    }

    const amount = roundCurrency(paymentAmount);

    if (amount <= 0) {
        console.warn('[inventoryBridge] Zero or negative payment amount – skipping');
        return null;
    }

    // Debit side = reduce the liability
    let payableLedger = await findLedger(tx, { code: 'GRIR', name: 'GR/IR' })
        || await findLedger(tx, { name: 'Goods Received Not Invoiced' })
        || await findLedger(tx, { name: 'GRNI' })
        || await findLedger(tx, { code: 'AP', name: 'Accounts Payable' })
        || await findLedger(tx, { code: '2010', name: 'Accounts Payable' })
        || await findLedger(tx, { name: 'Creditors' });

    // Credit side = Cash or Bank
    let cashOrBankLedger;
    if (paymentMethod === 'BANK' || paymentMethod === 'BANK_CHECK') {
        cashOrBankLedger = await findLedger(tx, { name: 'Bank', code: 'BANK' })
            || await findLedger(tx, { name: 'Primary Bank Account', code: '1020' })
            || await findLedger(tx, { name: 'Cash', code: 'CASH' });
    } else {
        cashOrBankLedger = await findLedger(tx, { name: 'Cash', code: 'CASH' })
            || await findLedger(tx, { name: 'Cash in Hand', code: '1010' })
            || await findLedger(tx, { name: 'Bank', code: 'BANK' });
    }

    if (!payableLedger || !cashOrBankLedger) {
        console.error('[inventoryBridge] Missing required ledgers for purchase payment');
        console.error('  Payable ledger found:', !!payableLedger);
        console.error('  Cash/Bank ledger found:', !!cashOrBankLedger);
        return null;
    }

    const voucherNumber = `PV-PUR-${Date.now().toString().slice(-6)}`;
    const defaultNarration = `Payment against ${grn?.grnNumber || purchaseOrder?.purchaseNumber || purchaseOrder?.poNumber || 'Purchase'} | ${paymentReference || ''}`.trim();

    const entries = [
        {
            ledgerId: payableLedger.id,
            debit: amount,
            credit: 0,
            notes: 'Reduce Accounts Payable / GR-IR',
        },
        {
            ledgerId: cashOrBankLedger.id,
            debit: 0,
            credit: amount,
            notes: paymentMethod === 'BANK' || paymentMethod === 'BANK_CHECK' ? 'Bank payment' : 'Cash payment',
        },
    ];

    validateDoubleEntry(entries);

    const totalDebit = roundCurrency(entries.reduce((s, e) => s + e.debit, 0));
    const totalCredit = roundCurrency(entries.reduce((s, e) => s + e.credit, 0));

    const voucher = await tx.voucher.create({
        data: {
            voucherNumber,
            voucherType: 'PAYMENT',
            voucherDate: new Date(),
            financialYear: getFinancialYear(),
            narration: narration || defaultNarration,
            status: 'POSTED',
            totalDebit,
            totalCredit,
            createdById: userId || null,
            referenceType: purchaseOrder ? 'PURCHASE_ORDER' : (grn ? 'GRN' : null),
            referenceId: purchaseOrder?.id || grn?.id || null,

            entries: {
                create: entries.map((e, idx) => ({
                    lineNumber: idx + 1,
                    ledgerId: e.ledgerId,
                    debit: e.debit,
                    credit: e.credit,
                    notes: e.notes || null,
                })),
            },
        },
        include: {
            entries: { include: { ledger: true } },
        },
    });

    await balanceService.updateBalancesOnPost(tx, voucher.entries);

    console.log(`[inventoryBridge] Purchase payment posted → ${voucher.voucherNumber} | Amount: ${amount}`);
    return voucher;
};

/**
 * Create Sales Receipt accounting entries (full or partial)
 * Dr Cash / Bank
 * Cr Accounts Receivable / Debtors
 */

export const createSalesReceiptAccountingEntries = async (tx, {
    receiptAmount,
    salesOrder = null,
    paymentMethod = 'CASH',
    paymentReference = null,
    userId = null,
    narration = null
}) => {
    const enabled = await isAccountsModuleEnabled(tx);
    if (!enabled) {
        console.log('[inventoryBridge] Accounts module is OFF – skipping sales receipt accounting');
        return null;
    }

    const amount = roundCurrency(receiptAmount);
    if (amount <= 0) {
        console.warn('[inventoryBridge] Zero or negative receipt amount – skipping');
        return null;
    }

    // ---- Cash / Bank ledger ----
    const isBank = ['BANK', 'BANK_CHECK'].includes((paymentMethod || '').toUpperCase());

    const cashOrBankLedger = isBank
        ? (await findLedger(tx, { name: 'Bank', code: 'BANK' })
            || await findLedger(tx, { name: 'Primary Bank Account', code: '1020' })
            || await findLedger(tx, { name: 'Cash', code: 'CASH' }))
        : (await findLedger(tx, { name: 'Cash', code: 'CASH' })
            || await findLedger(tx, { name: 'Cash in Hand', code: '1010' })
            || await findLedger(tx, { name: 'Bank', code: 'BANK' }));

    // ---- Accounts Receivable (single source of truth) ----
    // Prefer AR over Debtors to keep only one receivable ledger
    const receivableLedger = await findLedger(tx, { name: 'Accounts Receivable', code: 'AR' })
        || await findLedger(tx, { name: 'Debtors', code: 'DEBTORS' })
        || await findLedger(tx, { name: 'Customer' });

    if (!cashOrBankLedger || !receivableLedger) {
        console.error('[inventoryBridge] Missing required ledgers for sales receipt');
        console.error('  Cash/Bank ledger found:', !!cashOrBankLedger);
        console.error('  Receivable ledger found:', !!receivableLedger);
        return null;
    }

    const voucherNumber = `RV-SALE-${Date.now().toString().slice(-6)}`;
    const defaultNarration = `Receipt against Invoice ${salesOrder?.invoiceNumber || salesOrder?.orderRef || ''} | ${paymentReference || ''}`.trim();

    const entries = [
        {
            ledgerId: cashOrBankLedger.id,
            debit: amount,
            credit: 0,
            notes: isBank ? 'Bank receipt' : 'Cash receipt',
        },
        {
            ledgerId: receivableLedger.id,
            debit: 0,
            credit: amount,
            notes: 'Reduce Accounts Receivable',
        },
    ];

    validateDoubleEntry(entries);

    const totalDebit = roundCurrency(entries.reduce((s, e) => s + e.debit, 0));
    const totalCredit = roundCurrency(entries.reduce((s, e) => s + e.credit, 0));

    const voucher = await tx.voucher.create({
        data: {
            voucherNumber,
            voucherType: 'RECEIPT',
            voucherDate: new Date(),
            financialYear: getFinancialYear(),
            narration: narration || defaultNarration,
            status: 'POSTED',
            totalDebit,
            totalCredit,
            createdById: userId || null,
            referenceType: 'SALES_ORDER',
            referenceId: salesOrder?.id || null,

            entries: {
                create: entries.map((e, idx) => ({
                    lineNumber: idx + 1,
                    ledgerId: e.ledgerId,
                    debit: e.debit,
                    credit: e.credit,
                    notes: e.notes || null,
                })),
            },
        },
        include: {
            entries: { include: { ledger: true } },
        },
    });

    await balanceService.updateBalancesOnPost(tx, voucher.entries);

    console.log(`[inventoryBridge] Sales receipt posted → ${voucher.voucherNumber} | Amount: ${amount}`);
    return voucher;
};