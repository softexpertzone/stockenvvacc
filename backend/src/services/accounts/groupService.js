import prisma from '../../lib/prisma.js';

export const getAllGroups = async ({ nature, search, isActive }) => {
    const where = {};
    if (nature) where.nature = nature;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
        ];
    }

    return prisma.accountGroup.findMany({
        where,
        include: {
            parent: { select: { id: true, name: true, code: true } },
            _count: { select: { ledgers: true, children: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
};

export const getGroupTree = async () => {
    const groups = await prisma.accountGroup.findMany({
        where: { isActive: true },
        include: {
            children: {
                where: { isActive: true },
                include: {
                    children: true, // support 2-3 levels
                    ledgers: { where: { isActive: true }, select: { id: true, name: true, code: true } },
                },
            },
            ledgers: { where: { isActive: true }, select: { id: true, name: true, code: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Return only root groups
    return groups.filter((g) => !g.parentId);
};

export const getGroupById = async (id) => {
    return prisma.accountGroup.findUnique({
        where: { id },
        include: {
            parent: true,
            children: true,
            ledgers: true,
        },
    });
};

export const createGroup = async (data) => {
    const { name, code, nature, type = 'PRIMARY', parentId, description, sortOrder = 0 } = data;

    if (parentId) {
        const parent = await prisma.accountGroup.findUnique({ where: { id: parentId } });
        if (!parent) throw new Error('Parent group not found');
    }

    try {
        return await prisma.accountGroup.create({
            data: {
                name,
                code,
                nature,
                type,
                parentId: parentId || null,
                description,
                sortOrder,
            },
        });
    } catch (error) {
        // Prisma unique constraint error
        if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
            throw new Error('Group code already exists. Please use a different code.');
        }
        throw error;
    }
};

export const updateGroup = async (id, data) => {
    const existing = await prisma.accountGroup.findUnique({ where: { id } });
    if (!existing) throw new Error('Account group not found');

    if (data.parentId && data.parentId === id) {
        throw new Error('Group cannot be its own parent');
    }

    return prisma.accountGroup.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            nature: data.nature,
            type: data.type,
            parentId: data.parentId !== undefined ? data.parentId : undefined,
            description: data.description,
            isActive: data.isActive,
            sortOrder: data.sortOrder,
        },
    });
};

export const deleteGroup = async (id) => {
    const group = await prisma.accountGroup.findUnique({
        where: { id },
        include: { _count: { select: { ledgers: true, children: true } } },
    });

    if (!group) throw new Error('Account group not found');
    if (group._count.ledgers > 0) {
        throw new Error('Cannot delete group that has ledgers');
    }
    if (group._count.children > 0) {
        throw new Error('Cannot delete group that has child groups');
    }

    await prisma.accountGroup.delete({ where: { id } });
    return true;
};