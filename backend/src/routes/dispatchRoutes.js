// src/routes/dispatchRoutes.js
import express from 'express';
import { processDispatch } from '../controllers/dispatchController.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js'; // Import the audit middleware
import { DispatchSchema } from '../schemas/dispatch.schema.js';

const router = express.Router();

// Route with Validation AND Audit Logging
router.post('/',
    validate(DispatchSchema),
    audit('DISPATCH_ORDER'), // Log the action
    processDispatch
);

export default router;