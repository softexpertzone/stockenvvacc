import express from 'express';
import { processGRN, getGRNs } from '../controllers/grnController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// List GRNs (for dropdown)
router.get('/', authenticateToken, getGRNs);

// Process GRN
router.post('/process', authenticateToken, processGRN);

export default router;