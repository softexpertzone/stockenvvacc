import express from 'express';
import * as partnerController from '../controllers/partnerController.js';

const router = express.Router();

// Define the routes that point to your controller functions
router.get('/', partnerController.getPartners);
router.post('/', partnerController.registerPartner);

export default router;