import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

// The route must be '/' because '/api/dashboard' is already prefixed in server.js
router.get('/stats', dashboardController.getDashboardStats);

export default router;