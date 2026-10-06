// src/routes/adjustmentRoutes.js
import { Router } from 'express';
import { adjustStock } from '../controllers/adjustmentController.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { AdjustmentSchema } from '../schemas/adjustment.schema.js';

const router = Router();

// This route now has Validation AND automatic Audit Logging
router.post('/',
    validate(AdjustmentSchema),
    audit('STOCK_ADJUSTMENT'),
    adjustStock
);

export default router;