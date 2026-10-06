import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OAuth & Token File Paths
const CLIENT_SECRET_PATH = path.join(__dirname, '../../credentials/oauth-client.json');
const TOKEN_PATH = path.join(__dirname, '../../credentials/google-tokens.json');

// Database Credentials
const DB_NAME = 'stkenv2026';
const DB_USER = 'postgres';
const DB_HOST = 'localhost';
const DB_PORT = '5432';
const DB_PASSWORD = 'Dhaka@1230';

/**
 * Creates an OAuth2 client using the credentials file
 */
function createOAuth2Client() {
    if (!fs.existsSync(CLIENT_SECRET_PATH)) {
        throw new Error(`OAuth credentials file missing at ${CLIENT_SECRET_PATH}`);
    }

    const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf-8'));
    const { client_id, client_secret, redirect_uris } = credentials.web;

    return new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );
}

/**
 * Gets Google Auth URL for one-time user authorization
 */
export function getGoogleAuthUrl() {
    const oAuth2Client = createOAuth2Client();
    return oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/drive.file'],
    });
}

/**
 * Saves tokens returned from Google OAuth callback
 */
export async function saveGoogleTokens(code) {
    const oAuth2Client = createOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);

    const credsDir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(credsDir)) {
        fs.mkdirSync(credsDir, { recursive: true });
    }

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    return tokens;
}

/**
 * Gets an authenticated Google Drive client
 */
async function getAuthenticatedDriveClient() {
    const oAuth2Client = createOAuth2Client();

    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error('Google Drive is not authorized. Visit the authorization link first.');
    }

    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(tokens);

    // Persist refreshed tokens automatically
    oAuth2Client.on('tokens', (newTokens) => {
        const currentTokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
        const updated = { ...currentTokens, ...newTokens };
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
    });

    return google.drive({ version: 'v3', auth: oAuth2Client });
}

function createDatabaseDump() {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../../backups');

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const fileName = `stockenv-backup-${timestamp}.sql`;
        const filePath = path.join(backupDir, fileName);
        const pgDumpPath = `C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe`;

        const env = {
            ...process.env,
            PGPASSWORD: DB_PASSWORD,
        };

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

        dump.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        dump.on('error', (err) => reject(err));

        dump.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(errorOutput || `pg_dump failed with code ${code}`));
                return;
            }
            resolve({ filePath, fileName });
        });
    });
}

export async function backupDatabaseToGoogleDrive() {
    const drive = await getAuthenticatedDriveClient();
    const { filePath, fileName } = await createDatabaseDump();

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
        },
        media: {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(filePath),
        },
        fields: 'id, name, webViewLink',
    });

    return {
        success: true,
        message: 'Backup completed successfully',
        fileName: response.data.name,
        driveFileId: response.data.id,
        webViewLink: response.data.webViewLink,
    };
}