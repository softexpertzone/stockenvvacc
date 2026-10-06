import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  requireRoles,
} from '../middleware/permissionMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  registerUserRules,
  updateUserRules,
  changePasswordRules,
  listUsersRules,
} from '../validations/userValidation.js';
import { ROLES } from '../config/roles.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Create user (Admin / Super Admin only)
router.post(
    '/',
    requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    validate(registerUserRules),
    userController.registerUser
);

// List users (Admin / Super Admin only)
router.get(
    '/',
    requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    validate(listUsersRules),
    userController.listUsers
);

// Get single user
router.get('/:id', userController.getUser);

// Update user
router.patch(
    '/:id',
    validate(updateUserRules),
    userController.updateUser
);

// Change password
router.post(
    '/change-password',
    validate(changePasswordRules),
    userController.changePassword
);

export default router;