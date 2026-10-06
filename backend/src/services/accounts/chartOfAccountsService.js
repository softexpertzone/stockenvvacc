import prisma from '../../lib/prisma.js';

export const getChartOfAccounts = async (nature) => {
    const where = { isActive: true };
    if (nature) where.nature = nature;

    const groups = await prisma.accountGroup.findMany({
        where,
        include: {
            children: {
                where: { isActive: true },
                include: {
                    children: {
                        where: { isActive: true },
                        include: {
                            ledgers: {
                                where: { isActive: true },
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                    currentBalance: true,
                                    isDebitBalance: true,
                                    ledgerType: true,
                                },
                            },
                        },
                    },
                    ledgers: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            currentBalance: true,
                            isDebitBalance: true,
                            ledgerType: true,
                        },
                    },
                },
            },
            ledgers: {
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    currentBalance: true,
                    isDebitBalance: true,
                    ledgerType: true,
                },
            },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Return only root level groups
    return groups.filter((g) => !g.parentId);
};