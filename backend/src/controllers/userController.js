import * as userService from '../services/userService.js';
import { ROLES } from '../config/roles.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import {
    checkPermission,
    requireRoles,
    blockViewersOnWrite,
} from '../middleware/permissionMiddleware.js';

export async function registerUser(req, res, next) {
    try {
        if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) {
            return sendError(res, 'Only administrators can create users', 403);
        }

        const user = await userService.createUser(req.body, req.user.id);
        return sendSuccess(res, user, 'User created successfully', 201);
    } catch (err) {
        next(err);
    }
}

export async function listUsers(req, res, next) {
    try {
        if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) {
            return sendError(res, 'Access denied', 403);
        }

        const result = await userService.listUsers({
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            role: req.query.role,
            status: req.query.status,
            search: req.query.search,
        });

        return sendSuccess(res, result);
    } catch (err) {
        next(err);
    }
}

export async function getUser(req, res, next) {
    try {
        const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role);
        if (!isAdmin && req.user.id !== req.params.id) {
            return sendError(res, 'Access denied', 403);
        }

        const user = await userService.findById(req.params.id);
        if (!user) return sendError(res, 'User not found', 404);

        return sendSuccess(res, user);
    } catch (err) {
        next(err);
    }
}

export async function updateUser(req, res, next) {
    try {
        const isSuperAdmin = req.user.role === ROLES.SUPER_ADMIN;
        const isAdmin = req.user.role === ROLES.ADMIN;
        const isSelf = req.user.id === req.params.id;

        if (!isSuperAdmin && !isAdmin && !isSelf) {
            return sendError(res, 'Access denied', 403);
        }

        // Normal user cannot change role / status / modules
        if (!isSuperAdmin && !isAdmin) {
            delete req.body.role;
            delete req.body.status;
            delete req.body.allowedModules;
        }

        // Admin cannot create Super Admin or Admin
        if (isAdmin && !isSuperAdmin) {
            if (req.body.role === ROLES.SUPER_ADMIN || req.body.role === ROLES.ADMIN) {
                return sendError(res, 'You cannot assign Super Admin or Admin role', 403);
            }
        }

        // Module assignment hierarchy
        if (req.body.allowedModules !== undefined) {
            if (isSuperAdmin) {
                // Super Admin can give any modules → OK
            } else if (isAdmin) {
                // Admin can only give modules that HE has
                const myModules = req.user.allowedModules || [];
                const invalid = (req.body.allowedModules || []).filter(
                    (m) => !myModules.includes(m)
                );
                if (invalid.length > 0) {
                    return sendError(
                        res,
                        `You cannot assign modules you don't have: ${invalid.join(', ')}`,
                        403
                    );
                }
            }
        }

        const user = await userService.updateUser(req.params.id, req.body);
        return sendSuccess(res, user, 'User updated successfully');
    } catch (err) {
        next(err);
    }
}

export async function changePassword(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await userService.findByEmail(req.user.email);

        const valid = await userService.verifyPassword(user, currentPassword);
        if (!valid) return sendError(res, 'Current password is incorrect', 400);

        await userService.changePassword(req.user.id, newPassword);
        return sendSuccess(res, null, 'Password changed successfully');
    } catch (err) {
        next(err);
    }
}