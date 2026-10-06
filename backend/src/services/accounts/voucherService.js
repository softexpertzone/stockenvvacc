import prisma from '../../lib/prisma.js';
import { validateDoubleEntry } from '../../utils/accounts/doubleEntry.js';
import { generateVoucherNumber } from '../../utils/accounts/voucherNumber.js';
import * as balanceService from './balanceService.js';

// Safe currency rounding
const roundCurrency = (value) =>
    Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const getAllVouchers = async ({ type, status, fromDate, toDate, page = 1, limit = 20, search }) => {
    const where = {};

    if (type) where.voucherType = type;
    if (status) where.status = status;
    if (fromDate || toDate) {
        where.voucherDate = {};
        if (fromDate) where.voucherDate.gte = new Date(fromDate);
        if (toDate) where.voucherDate.lte = new Date(toDate);
    }
    if (search) {
        where.OR = [
            { voucherNumber: { contains: search, mode: 'insensitive' } },
            { narration: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [data, total] = await Promise.all([
        prisma.voucher.findMany({
            where,
            include: {
                entries: {
                    include: { ledger: { select: { id: true, name: true, code: true } } },
                    orderBy: { lineNumber: 'asc' },
                },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: [{ voucherDate: 'desc' }, { createdAt: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.voucher.count({ where }),
    ]);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export const getVoucherById = async (id) => {
    return prisma.voucher.findUnique({
        where: { id },
        include: {
            entries: {
                include: { ledger: true },
                orderBy: { lineNumber: 'asc' },
            },
            createdBy: { select: { id: true, name: true, email: true } },
        },
    });
};

export const createVoucher = async (data, userId) => {
    console.log('===== CREATE VOUCHER DEBUG =====');
    console.log('FULL DATA RECEIVED:', JSON.stringify(data, null, 2));
    console.log('================================');

    const voucherNumber = data.voucherNumber || `${data.voucherType}-${Date.now().toString().slice(-6)}`;
    const totalDebit = (data.entries || []).reduce((sum, e) => sum + Number(e.debit || 0), 0);
    const totalCredit = (data.entries || []).reduce((sum, e) => sum + Number(e.credit || 0), 0);

    validateDoubleEntry(data.entries || []);

    // ✅ NEW: Payment Amount must match Debit & Credit totals
    if (data.voucherType === 'PAYMENT' && data.paymentAmount != null) {
        const paymentAmt = Number(data.paymentAmount || 0);

        if (Math.abs(paymentAmt - totalDebit) > 0.01) {
            throw new Error(`Payment Amount (${paymentAmt}) must equal Total Debit (${totalDebit})`);
        }
        if (Math.abs(paymentAmt - totalCredit) > 0.01) {
            throw new Error(`Payment Amount (${paymentAmt}) must equal Total Credit (${totalCredit})`);
        }
    }

    let validCreatedById = null;
    if (userId) {
        const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (userExists) validCreatedById = userId;
    }

    try {
        return await prisma.$transaction(async (tx) => {
            // Force the values
            const refType = data.purchaseOrderId ? 'PURCHASE_ORDER' : null;
            const refId = data.purchaseOrderId || null;

            console.log('>>> SETTING referenceType =', refType);
            console.log('>>> SETTING referenceId =', refId);

            const voucher = await tx.voucher.create({
                data: {
                    voucherNumber,
                    voucherType: data.voucherType,
                    voucherDate: new Date(data.voucherDate),
                    financialYear: data.financialYear || '2025-26',
                    narration: data.narration,
                    status: data.status || 'DRAFT',
                    totalDebit,
                    totalCredit,
                    ...(validCreatedById && {
                        createdBy: { connect: { id: validCreatedById } },
                    }),
                    referenceType: refType,
                    referenceId: refId,
                    entries: {
                        create: (data.entries || []).map((entry, index) => ({
                            lineNumber: index + 1,
                            ledgerId: entry.ledgerId,
                            debit: Number(entry.debit || 0),
                            credit: Number(entry.credit || 0),
                            notes: entry.notes || '',
                        })),
                    },
                },
                include: {
                    entries: { include: { ledger: true } },
                },
            });

            // ✅ Do NOT update PO paidAmount / dueAmount here.
            // PO balance should only be updated when the voucher is POSTED.

            return voucher;
        });
    } catch (error) {
        console.error('CREATE VOUCHER ERROR:', error);
        throw error;
    }
};

export const updateVoucher = async (id, data) => {
    const existing = await prisma.voucher.findUnique({ where: { id } });
    if (!existing) throw new Error('Voucher not found');
    if (existing.status !== 'DRAFT') {
        throw new Error('Only DRAFT vouchers can be updated');
    }

    const { voucherDate, narration, entries, financialYear, paymentAmount } = data;

    if (entries) {
        validateDoubleEntry(entries);
    }

    const totalDebit = entries
        ? entries.reduce((sum, e) => sum + Number(e.debit || 0), 0)
        : existing.totalDebit;
    const totalCredit = entries
        ? entries.reduce((sum, e) => sum + Number(e.credit || 0), 0)
        : existing.totalCredit;

    // ✅ NEW: Payment Amount must match Debit & Credit totals
    if (existing.voucherType === 'PAYMENT' && paymentAmount != null) {
        const paymentAmt = Number(paymentAmount || 0);

        if (Math.abs(paymentAmt - totalDebit) > 0.01) {
            throw new Error(`Payment Amount (${paymentAmt}) must equal Total Debit (${totalDebit})`);
        }
        if (Math.abs(paymentAmt - totalCredit) > 0.01) {
            throw new Error(`Payment Amount (${paymentAmt}) must equal Total Credit (${totalCredit})`);
        }
    }

    return prisma.$transaction(async (tx) => {
        // Delete old entries
        await tx.voucherEntry.deleteMany({ where: { voucherId: id } });

        const voucher = await tx.voucher.update({
            where: { id },
            data: {
                voucherDate: voucherDate ? new Date(voucherDate) : undefined,
                narration,
                financialYear,
                totalDebit,
                totalCredit,
                entries: entries
                    ? {
                        create: entries.map((entry, index) => ({
                            ledgerId: entry.ledgerId,
                            debit: entry.debit || 0,
                            credit: entry.credit || 0,
                            notes: entry.notes || null,
                            lineNumber: index + 1,
                        })),
                    }
                    : undefined,
            },
            include: {
                entries: { include: { ledger: true } },
            },
        });

        return voucher;
    });
};

export const postVoucher = async (id, userId) => {
    const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: { entries: true },
    });

    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status !== 'DRAFT') {
        throw new Error('Only DRAFT vouchers can be posted');
    }

    validateDoubleEntry(voucher.entries);

    return prisma.$transaction(async (tx) => {
        // Update ledger balances
        await balanceService.updateBalancesOnPost(tx, voucher.entries);

        const updated = await tx.voucher.update({
            where: { id },
            data: {
                status: 'POSTED',
                postedAt: new Date(),
            },
            include: {
                entries: { include: { ledger: true } },
            },
        });

        // ---------- Update PO due amount ONLY when posting a PAYMENT against PO ----------
        if (
            voucher.voucherType === 'PAYMENT' &&
            voucher.referenceType === 'PURCHASE_ORDER' &&
            voucher.referenceId
        ) {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: voucher.referenceId },
            });

            if (po) {
                const paymentAmount = Number(voucher.totalDebit || 0);
                const newPaidAmount = roundCurrency(Number(po.paidAmount || 0) + paymentAmount);
                const grandTotal = Number(po.grandTotal || po.totalAmount || 0);
                const newDueAmount = roundCurrency(Math.max(0, grandTotal - newPaidAmount));

                let paymentStatus = 'UNPAID';
                if (newPaidAmount >= grandTotal && grandTotal > 0) {
                    paymentStatus = 'PAID';
                } else if (newPaidAmount > 0) {
                    paymentStatus = 'PARTIALLY_PAID';
                }

                await tx.purchaseOrder.update({
                    where: { id: voucher.referenceId },
                    data: {
                        paidAmount: newPaidAmount,
                        dueAmount: newDueAmount,
                        paymentStatus,
                    },
                });

                console.log(
                    `[postVoucher] Updated PO ${po.purchaseNumber || po.id} → paid: ${newPaidAmount}, due: ${newDueAmount}`
                );
            }
        }

        return updated;
    });
};

export const cancelVoucher = async (id, reason, userId) => {
    const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: { entries: true },
    });

    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status === 'CANCELLED') {
        throw new Error('Voucher is already cancelled');
    }

    return prisma.$transaction(async (tx) => {
        // Reverse balances if it was posted
        if (voucher.status === 'POSTED') {
            await balanceService.reverseBalancesOnCancel(tx, voucher.entries);
        }

        const updated = await tx.voucher.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: reason || 'Cancelled by user',
            },
            include: {
                entries: { include: { ledger: true } },
            },
        });

        return updated;
    });
};

export const deleteVoucher = async (id) => {
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status !== 'DRAFT') {
        throw new Error('Only DRAFT vouchers can be deleted');
    }

    await prisma.voucher.delete({ where: { id } });
    return true;
};