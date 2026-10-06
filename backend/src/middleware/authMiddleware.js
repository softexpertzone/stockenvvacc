import jwt from 'jsonwebtoken';
import { sendError } from '../utils/responseHandler.js';

/**
 * Combined Middleware: Handles Development Bypass and Production JWT.
 * This is the single source of truth for all request authentication.
 */
export const authenticateToken = (req, res, next) => {
  // 1. Environment Configuration
  const isDev = process.env.NODE_ENV !== 'production' && process.env.BYPASS_AUTH === 'true';

  // Use the verified Database Admin ID for Kazi Ahmad Moin Uddin
  const REAL_ADMIN_ID = 'e005ae9f-83d1-4f96-af18-bb0b6de7b2f4';

  // 2. Development Bypass
  if (isDev) {
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      allowedModules: decoded.allowedModules || [],
    };
    return next();
  }

  // 3. Production JWT Verification
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 'Access denied. No token provided.', 401);
  }

  try {
    // Use the same secret as authController (JWT_SECRET or ACCESS_TOKEN_SECRET)
    const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
      console.error('JWT secret is not defined in environment variables');
      return sendError(res, 'Server configuration error', 500);
    }

    const decoded = jwt.verify(token, secret);

    // Attach decoded payload to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired token.', 401); // 401 is more standard than 403
  }
};

// Alias so older route files that still import { authenticate } keep working
export const authenticate = authenticateToken;

/**
 * Role-based access control (RBAC)
 * Example usage: router.post('/products', authenticateToken, authorize('ADMIN'));
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'User not authenticated.', 401);
    }

    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toUpperCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      return sendError(res, 'Forbidden: You do not have the required permissions.', 403);
    }

    next();
  };
};