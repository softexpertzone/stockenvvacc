import express from 'express';
import * as ledgerController from '../../controllers/Accounts/ledgerController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { checkPermission } from '../../middleware/permissionMiddleware.js';
import validate from '../../middleware/validate.js';
import {
    createLedgerSchema,
    updateLedgerSchema,
} from '../../validations/accounts/ledgerValidation.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', checkPermission('accounts.ledger.view'), ledgerController.getAllLedgers);
router.get('/:id', checkPermission('accounts.ledger.view'), ledgerController.getLedgerById);
router.get('/:id/balance', checkPermission('accounts.ledger.view'), ledgerController.getLedgerBalance);
router.post('/', checkPermission('accounts.ledger.create'), validate(createLedgerSchema), ledgerController.createLedger);
router.put('/:id', checkPermission('accounts.ledger.update'), validate(updateLedgerSchema), ledgerController.updateLedger);
router.delete('/:id', checkPermission('accounts.ledger.delete'), ledgerController.deleteLedger);

export default router;