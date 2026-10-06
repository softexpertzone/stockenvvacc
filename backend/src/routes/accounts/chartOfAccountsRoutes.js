import express from 'express';
import * as chartOfAccountsController from '../../controllers/Accounts/chartOfAccountsController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { checkPermission } from '../../middleware/permissionMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', checkPermission('accounts.chart.view'), chartOfAccountsController.getChartOfAccounts);

export default router;