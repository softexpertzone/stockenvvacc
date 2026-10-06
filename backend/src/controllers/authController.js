import jwt from 'jsonwebtoken';
import * as userService from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user) {
  return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        allowedModules: user.allowedModules || [],
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * PUBLIC Registration
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'Name, email and password are required', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    // Allow role from frontend, but fall back to safe default
    const allowedRoles = [
      'SUPER_ADMIN',
      'ADMIN',
      'PURCHASER',
      'SALESPERSON',
      'PURCHASE_VIEWER',
      'SALES_VIEWER',
      'PICKER',
    ];

    const finalRole = allowedRoles.includes(role) ? role : 'SALES_VIEWER';

    const user = await userService.createUser({
      name,
      email,
      password,
      phone: phone || null,
      role: finalRole,
    });

    const token = generateToken(user);

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status || 'ACTIVE',
      allowedModules: user.allowedModules || [],
    };

    return sendSuccess(
        res,
        { token, user: safeUser },
        'Registration successful',
        201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PUBLIC Login
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const user = await userService.findByEmail(email);

    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    if (user.status && user.status !== 'ACTIVE') {
      return sendError(res, 'Your account is not active. Please contact admin.', 403);
    }

    const isValidPassword = await userService.verifyPassword(user, password);

    if (!isValidPassword) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Update last login time
    await userService.updateLastLogin(user.id);

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status || 'ACTIVE',
      allowedModules: user.allowedModules || [],
    };

    const token = generateToken(safeUser);

    return sendSuccess(
        res,
        {
          token,
          user: safeUser,
        },
        'Login successful'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Get current logged-in user
 * GET /api/auth/me
 */
export async function me(req, res, next) {
  try {
    // req.user is set by authenticateToken middleware
    const user = await userService.findById(req.user.id);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status || 'ACTIVE',
      allowedModules: user.allowedModules || [],
    };

    return sendSuccess(res, { user: safeUser }, 'User profile');
  } catch (err) {
    next(err);
  }
}

/**
 * Update permissions (protected route)
 * PUT /api/auth/permissions/:userId
 */
export async function updatePermissions(req, res, next) {
  try {
    // TODO: implement real permission update logic later
    return sendError(res, 'Not implemented yet', 501);
  } catch (err) {
    next(err);
  }
}