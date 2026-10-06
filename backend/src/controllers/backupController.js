import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import {
    getGoogleAuthUrl,
    saveGoogleTokens,
    backupDatabaseToGoogleDrive
} from '../services/googleDriveBackup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB credentials for local download
const DB_NAME = process.env.DB_NAME || 'stkenv2026';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Dhaka@1230';

// Get OAuth Authorization URL
export const getAuthUrl = async (req, res, next) => {
    try {
        const url = getGoogleAuthUrl();
        res.json({ success: true, url });
    } catch (error) {
        next(error);
    }
};

// Handle OAuth Callback from Google
export const handleCallback = async (req, res, next) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).send('Authorization code is missing.');
        }
        await saveGoogleTokens(code);
        res.send(`
            <div style="font-family: system-ui, sans-serif; text-align: center; padding: 60px 20px;">
                <h1 style="color: #16a34a; margin-bottom: 8px;">Google Drive Authorized!</h1>
                <p style="color: #4b5563;">Your token has been stored securely. You can close this window and return to the ERP system.</p>
            </div>
        `);
    } catch (error) {
        next(error);
    }
};

// Trigger Google Drive Backup
export const createGoogleDriveBackup = async (req, res, next) => {
    try {
        const result = await backupDatabaseToGoogleDrive();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Backup to Google Drive failed',
            error: error.message
        });
    }
};

// Download Local Backup File
export const downloadBackup = async (req, res, next) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../../backups');

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const fileName = `stockenv-backup-${timestamp}.sql`;
        const filePath = path.join(backupDir, fileName);
        const pgDumpPath = `C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe`;

        const env = { ...process.env, PGPASSWORD: DB_PASSWORD };

        const dump = spawn(pgDumpPath, [
            '-h', DB_HOST,
            '-p', DB_PORT,
            '-U', DB_USER,
            '-d', DB_NAME,
            '-F', 'c',
            '-b',
            '-v',
            '-f', filePath,
        ], { env });

        let errorOutput = '';
        dump.stderr.on('data', (data) => { errorOutput += data.toString(); });

        dump.on('close', (code) => {
            if (code !== 0) {
                return res.status(500).json({ success: false, message: errorOutput || 'pg_dump failed' });
            }
            res.download(filePath, fileName, (err) => {
                if (err && !res.headersSent) {
                    next(err);
                }
            });
        });
    } catch (error) {
        next(error);
    }
};

// Helper: Remove Google Drive backups older than 30 days
async function deleteOldBackups(drive) {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const response = await drive.files.list({
            q: "name contains 'stockenv-backup-' and trashed = false",
            fields: 'files(id, name, createdTime)',
            orderBy: 'createdTime asc',
        });

        const files = response.data.files || [];

        for (const file of files) {
            const fileCreatedDate = new Date(file.createdTime);
            if (fileCreatedDate < thirtyDaysAgo) {
                await drive.files.delete({ fileId: file.id });
                console.log(`🧹 Cleaned up backup older than 30 days: ${file.name}`);
            }
        }
    } catch (error) {
        console.error('⚠️ Warning: Automated retention cleanup failed:', error.message);
    }
}

// Main Google Drive Backup Handler
export const runGoogleDriveBackup = async (req = null, res = null) => {
    try {
        // ... [Your existing OAuth token retrieve, pg_dump execution, and drive.files.create logic] ...

        // Execute cleanup immediately after success
        await deleteOldBackups(drive);

        const resultData = {
            success: true,
            message: 'Backup uploaded to Google Drive and old backups purged.',
            fileName,
            driveFileId: response.data.id,
            webViewLink: response.data.webViewLink,
        };

        if (res) return res.json(resultData);
        return resultData;
    } catch (error) {
        console.error('❌ Google Drive backup failed:', error.message);
        if (res) return res.status(500).json({ success: false, error: error.message });
        throw error;
    }
};