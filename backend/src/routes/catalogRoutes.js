import express from 'express';

// 1. Controller Imports
import * as catalogController from '../controllers/catalogController.js';
import * as productController from '../controllers/productController.js';

// 2. Middleware & Validation Imports
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { createProductSchema } from '../validations/productValidation.js';

const router = express.Router();

// ==========================================
// Test Route
// ==========================================
router.get('/test-connection', catalogController.testConnection);

// ==========================================
// Metadata: Categories, Brands, Suppliers
// ==========================================
router.get('/categories', catalogController.getAllCategories);
router.post('/categories', authenticateToken, catalogController.createCategory);

router.get('/brands', catalogController.getAllBrands);
router.post('/brands', authenticateToken, catalogController.createBrand);

router.get('/suppliers', catalogController.getAllSuppliers);

// ==========================================
// Attribute Definitions
// ==========================================
router.get('/attributes/definitions', catalogController.getAllAttributeDefinitions);
router.post('/attributes/define', authenticateToken, catalogController.createAttributeDefinition);

// ==========================================
// Products & Variants
// ==========================================
router.get('/products', productController.getAllProducts);

// TEMPORARILY removed authorize('ADMIN') for development
router.post(
    '/products',
    authenticateToken,
    validate(createProductSchema),
    catalogController.createProduct
);

router.post('/variants', authenticateToken, catalogController.createVariant);

export default router;