import express from 'express';
import {
    downloadBackup,
    createGoogleDriveBackup,
    getAuthUrl
} from '../controllers/backupController.js';
// import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Local Backup Download
router.get('/backup/download', /* authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), */ downloadBackup);

// Google Drive Backup Routes
router.get('/backup/google-drive/auth-url', /* authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), */ getAuthUrl);
router.post('/backup/google-drive', /* authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), */ createGoogleDriveBackup);

export default router;