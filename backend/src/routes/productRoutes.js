import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Define routes
router.post('/', authenticateToken, productController.createProduct);
router.get('/variants', authenticateToken, productController.getAllVariants);

export default router;