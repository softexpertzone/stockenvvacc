import express from 'express';
import getPurchaseOrders from '../controllers/purchaseController.js';          // default export
import * as purchaseController from '../controllers/purchaseController.js';  // still need the others

import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Base orders routing
router.get('/', authenticateToken, getPurchaseOrders);
router.get('/orders', authenticateToken, getPurchaseOrders);

// 2. Fallback legacy pending endpoint
router.get('/pending', authenticateToken, getPurchaseOrders);

// 3. Get Single Purchase Order by ID
router.get('/orders/:id', authenticateToken, purchaseController.getPurchaseOrderById);

// 4. Create Purchase Order
router.post('/', authenticateToken, purchaseController.createPurchaseOrder);

// 5. Process Goods Receipt Note
router.post('/process-grn', authenticateToken, purchaseController.processGRN);

// 6. Process Purchase Return
router.post('/return', authenticateToken, purchaseController.processPurchaseReturn);

// 7. Process Stock Sorting / Re-evaluation
router.post('/process-sorting', authenticateToken, purchaseController.processSortingReevaluation);

export default router;