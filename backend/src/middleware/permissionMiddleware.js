import { ROLES, PERMISSIONS } from '../config/roles.js';
import prisma from '../lib/prisma.js';   // change path if your prisma is in config/db.js

/**
 * Primary permission check – Role based
 * Usage: checkPermission('purchase:create')
 *        checkPermission(['sales:read', 'sales:create'])
 */
export const checkPermission = (required) => {
  const requiredList = Array.isArray(required) ? required : [required];

  return async (req, res, next) => {
    // DEVELOPMENT BYPASS – enabled for now
    console.log(`--- Permission Middleware: Bypassing [${requiredList}] check ---`);
    return next();

    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userRole = req.user.role;
      const userPerms = PERMISSIONS[userRole] || [];

      // SUPER_ADMIN & ADMIN have full access
      if (
          userPerms.includes('*') ||
          userRole === ROLES.SUPER_ADMIN ||
          userRole === ROLES.ADMIN
      ) {
        return next();
      }

      const hasPermission = requiredList.every((perm) =>
          userPerms.includes(perm)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Operation denied: Insufficient permissions for your role',
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal authorization error',
      });
    }
  };
};

/**
 * Restrict route to specific roles
 * Usage: requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
 */
export const requireRoles = (...roles) => {
  const allowed = roles.flat();

  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for your role',
      });
    }
    next();
  };
};

/**
 * Safety net – blocks any write action for viewers
 * Put this on purchaseRoutes and salesRoutes
 */
export const blockViewersOnWrite = (req, res, next) => {
  const isViewer =
      req.user?.role === ROLES.PURCHASE_VIEWER ||
      req.user?.role === ROLES.SALES_VIEWER;

  if (isViewer && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(403).json({
      success: false,
      message: 'Viewers have read-only access',
    });
  }
  next();
};

/**
 * Optional: Old flag-based check (kept for compatibility)
 */
export const checkPermissionFlag = (permissionFlag) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) {
        return next();
      }

      const userPerms = await prisma.permission.findUnique({
        where: { userId: req.user.id },
      });

      if (!userPerms || !userPerms[permissionFlag]) {
        return res.status(403).json({
          success: false,
          message: 'Operation denied: Insufficient clearance flags',
        });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: 'Internal authorization error',
      });
    }
  };
};