import express from 'express';
import * as internalOpsController from '../controllers/internalOpsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/internal-ops/transfer
router.post('/transfer', authenticateToken, internalOpsController.handleTransfer);

// POST /api/internal-ops/adjust
router.post('/adjust', authenticateToken, internalOpsController.handleAdjustment);

// POST /api/internal-ops/reevaluate-stock
router.post('/reevaluate-stock', authenticateToken, internalOpsController.handleBulkReclassification);

export default router;