// src/routes/Accounts/voucherRoutes.js
import express from 'express';
import * as voucherController from '../../controllers/Accounts/voucherController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { checkPermission } from '../../middleware/permissionMiddleware.js';
import validate from '../../middleware/validate.js';
import {
    createVoucherSchema,
    updateVoucherSchema,
    cancelVoucherSchema,
} from '../../validations/accounts/voucherValidation.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', checkPermission('accounts.voucher.view'), voucherController.getAllVouchers);
router.get('/:id', checkPermission('accounts.voucher.view'), voucherController.getVoucherById);

// Create general voucher
router.post('/', checkPermission('accounts.voucher.create'), validate(createVoucherSchema), voucherController.createVoucher);

// Create payment voucher specifically
router.post('/payment', checkPermission('accounts.voucher.create'), validate(createVoucherSchema), voucherController.createVoucher);

router.put('/:id', checkPermission('accounts.voucher.update'), validate(updateVoucherSchema), voucherController.updateVoucher);

router.post('/:id/post', checkPermission('accounts.voucher.post'), voucherController.postVoucher);

router.post('/:id/cancel', checkPermission('accounts.voucher.cancel'), validate(cancelVoucherSchema), voucherController.cancelVoucher);
router.delete('/:id', checkPermission('accounts.voucher.delete'), voucherController.deleteVoucher);

export default router;