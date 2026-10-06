import express from 'express';
// Note: Ensure controller folder is renamed to lowercase 'accounts' on disk
import * as reportController from '../../controllers/accounts/reportController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { checkPermission } from '../../middleware/permissionMiddleware.js';

const router = express.Router();

// Apply auth middleware to all report endpoints
router.use(authenticateToken);

router.get('/trial-balance', checkPermission('accounts.report.view'), reportController.getTrialBalance);
router.get('/profit-loss', checkPermission('accounts.report.view'), reportController.getProfitAndLoss);
router.get('/balance-sheet', checkPermission('accounts.report.view'), reportController.getBalanceSheet);
router.get('/general-ledger', checkPermission('accounts.report.view'), reportController.getGeneralLedger);
router.get('/voucher-ledger', checkPermission('accounts.report.view'), reportController.getVoucherLedger);

// Added missing Cash Flow route
router.get('/cash-flow', checkPermission('accounts.report.view'), reportController.getCashFlow);

export default router;