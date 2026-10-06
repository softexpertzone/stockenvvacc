import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { ROLES, ROLE_LABELS } from '../config/roles.js';

const SALT_ROUNDS = 12;

function safeUserSelect() {
    return {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        allowedModules: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
    };
}

export async function createUser(data, createdById = null) {
    const { email, password, name, phone, role } = data;

    const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
        const err = new Error('Email already registered');
        err.statusCode = 409;
        throw err;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    return prisma.user.create({
        data: {
            email: email.toLowerCase().trim(),
            password: hashed,
            name: name.trim(),
            phone: phone?.trim() || null,
            role: role || ROLES.SALES_VIEWER,
            status: 'ACTIVE',
            createdById,
            allowedModules: data.allowedModules || [],
        },
        select: safeUserSelect(),
    });
}

export async function findByEmail(email) {
    // Important: return full user (including password) for login verification
    return prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
    });
}

export async function findById(id) {
    return prisma.user.findUnique({
        where: { id },
        select: safeUserSelect(),
    });
}

export async function listUsers({ page = 1, limit = 20, role, status, search } = {}) {
    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [data, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: safeUserSelect(),
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
    ]);

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function updateUser(id, data) {
    const allowed = ['name', 'phone', 'role', 'status', 'allowedModules'];
    const updateData = {};

    const validRoles = [
        'SUPER_ADMIN',
        'ADMIN',
        'PURCHASER',
        'SALESPERSON',
        'PURCHASE_VIEWER',
        'SALES_VIEWER',
        'PICKER',
    ];

    for (const key of allowed) {
        if (data[key] !== undefined) {
            if (key === 'role' && !validRoles.includes(data[key])) {
                const err = new Error(`Invalid role: ${data[key]}`);
                err.statusCode = 400;
                throw err;
            }
            updateData[key] =
                typeof data[key] === 'string' ? data[key].trim() : data[key];
        }
    }

    return prisma.user.update({
        where: { id },
        data: updateData,
        select: safeUserSelect(),
    });
}

export async function changePassword(userId, newPassword) {
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
    });
}

export async function verifyPassword(user, plainPassword) {
    if (!user || !user.password) return false;
    return bcrypt.compare(plainPassword, user.password);
}

export function getRoleLabel(role) {
    return ROLE_LABELS[role] || role;
}

export async function updateLastLogin(userId) {
    return prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
    });
}