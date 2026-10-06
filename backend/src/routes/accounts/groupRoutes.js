import express from 'express';
import * as groupController from '../../controllers/Accounts/groupController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { checkPermission } from '../../middleware/permissionMiddleware.js';
import validate from '../../middleware/validate.js';
import {
    createGroupSchema,
    updateGroupSchema,
} from '../../validations/accounts/groupValidation.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', checkPermission('accounts.group.view'), groupController.getAllGroups);
router.get('/tree', checkPermission('accounts.group.view'), groupController.getGroupTree);
router.get('/:id', checkPermission('accounts.group.view'), groupController.getGroupById);
router.post('/', checkPermission('accounts.group.create'), validate(createGroupSchema), groupController.createGroup);
router.put('/:id', checkPermission('accounts.group.update'), validate(updateGroupSchema), groupController.updateGroup);
router.delete('/:id', checkPermission('accounts.group.delete'), groupController.deleteGroup);

export default router;