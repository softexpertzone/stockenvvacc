import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

console.log("DEBUG: settingsRoutes.js loaded");

// ==========================================
// Module Settings (Super Admin)
// ==========================================
router.get('/modules', authenticateToken, settingsController.getModuleSettings);
router.put('/modules', authenticateToken, settingsController.updateModuleSettings);

// ==========================================
// UOM Routes
// ==========================================
router.get('/uoms', authenticateToken, settingsController.getUoms);
router.post('/uoms', authenticateToken, settingsController.createUom);

// ==========================================
// Tax Routes
// ==========================================
router.get('/taxes', authenticateToken, settingsController.getTaxes);
router.post('/taxes', authenticateToken, settingsController.createTax);

// ==========================================
// Attribute Routes
// ==========================================
router.get('/attributes', authenticateToken, settingsController.getAttributes);
router.post('/attributes', authenticateToken, settingsController.createAttribute);
router.post('/attributes/:id/values', authenticateToken, settingsController.addAttributeValue);

// ==========================================
// Return Reasons
// ==========================================
router.get('/return-reasons', authenticateToken, settingsController.getReturnReasons);
router.post('/return-reasons', authenticateToken, settingsController.createReturnReason);
router.put('/return-reasons/:id', authenticateToken, settingsController.updateReturnReason);
router.delete('/return-reasons/:id', authenticateToken, settingsController.deleteReturnReason);

export default router;