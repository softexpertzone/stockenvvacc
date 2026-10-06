import prisma from '../../lib/prisma.js';

export const getAllLedgers = async ({ groupId, ledgerType, search, isActive, page = 1, limit = 50 }) => {
    const where = {};
    if (groupId) where.groupId = groupId;
    if (ledgerType) where.ledgerType = ledgerType;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [data, total] = await Promise.all([
        prisma.accountLedger.findMany({
            where,
            include: {
                group: { select: { id: true, name: true, code: true, nature: true } },
                partner: { select: { id: true, name: true } },
            },
            orderBy: [{ name: 'asc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.accountLedger.count({ where }),
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

export const getLedgerById = async (id) => {
    return prisma.accountLedger.findUnique({
        where: { id },
        include: {
            group: true,
            partner: true,
        },
    });
};

export const createLedger = async (data) => {
    const {
        name,
        code,
        groupId,
        ledgerType = 'GENERAL',
        openingBalance = 0,
        isDebitBalance = true,
        partnerId,
        description,
    } = data;

    const group = await prisma.accountGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Account group not found');

    return prisma.accountLedger.create({
        data: {
            name,
            code,
            groupId,
            ledgerType,
            openingBalance,
            currentBalance: openingBalance, // initial current = opening
            isDebitBalance,
            partnerId: partnerId || null,
            description,
        },
        include: {
            group: true,
        },
    });
};

export const updateLedger = async (id, data) => {
    const existing = await prisma.accountLedger.findUnique({ where: { id } });
    if (!existing) throw new Error('Ledger not found');
    if (existing.isSystem) {
        throw new Error('System ledgers cannot be modified');
    }

    // Do not allow changing openingBalance after transactions exist
    if (data.openingBalance !== undefined && Number(data.openingBalance) !== Number(existing.openingBalance)) {
        const hasEntries = await prisma.voucherEntry.count({ where: { ledgerId: id } });
        if (hasEntries > 0) {
            throw new Error('Cannot change opening balance after transactions exist');
        }
    }

    return prisma.accountLedger.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            groupId: data.groupId,
            ledgerType: data.ledgerType,
            openingBalance: data.openingBalance,
            currentBalance: data.openingBalance !== undefined ? data.openingBalance : undefined,
            isDebitBalance: data.isDebitBalance,
            partnerId: data.partnerId,
            description: data.description,
            isActive: data.isActive,
        },
        include: {
            group: true,
        },
    });
};

export const deleteLedger = async (id) => {
    const ledger = await prisma.accountLedger.findUnique({
        where: { id },
        include: { _count: { select: { voucherEntries: true } } },
    });

    if (!ledger) throw new Error('Ledger not found');
    if (ledger.isSystem) throw new Error('System ledgers cannot be deleted');
    if (ledger._count.voucherEntries > 0) {
        throw new Error('Cannot delete ledger that has transactions');
    }

    await prisma.accountLedger.delete({ where: { id } });
    return true;
};

export const getLedgerBalance = async (id) => {
    const ledger = await prisma.accountLedger.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            code: true,
            openingBalance: true,
            currentBalance: true,
            isDebitBalance: true,
        },
    });

    if (!ledger) throw new Error('Ledger not found');
    return ledger;
};