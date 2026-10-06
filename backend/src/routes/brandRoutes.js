import express from 'express';
import * as brandController from '../controllers/brandController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. GET: Fetch list
router.get('/', authenticateToken, brandController.getAllBrandsAndModels);

// 2. POST: Create new
router.post('/', authenticateToken, brandController.createBrand);

// 3. GET: Sub-brands
router.get('/:parentId/subs', authenticateToken, brandController.getSubBrands);

// 4. DELETE: Remove
router.delete('/:id', authenticateToken, brandController.deleteBrand);

export default router;