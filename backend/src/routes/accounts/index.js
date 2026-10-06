import express from 'express';
import { checkModule } from '../../middleware/moduleGuard.js';

import voucherRoutes from './voucherRoutes.js';
import groupRoutes from './groupRoutes.js';
import ledgerRoutes from './ledgerRoutes.js';
import chartOfAccountsRoutes from './chartOfAccountsRoutes.js';
import reportRoutes from './reportRoutes.js';

const router = express.Router();

// ===== PROTECT ALL ACCOUNTS ROUTES =====
router.use(checkModule('accounts'));

router.use('/vouchers', voucherRoutes);
router.use('/groups', groupRoutes);
router.use('/ledgers', ledgerRoutes);
router.use('/chart-of-accounts', chartOfAccountsRoutes);
router.use('/reports', reportRoutes);

export default router;