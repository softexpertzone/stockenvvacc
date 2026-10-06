import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';

// Local Middleware & Database
import errorHandler from './middleware/errorHandler.js';
import prisma from './lib/prisma.js';

// Controllers
import { handleCallback, runGoogleDriveBackup } from './controllers/backupController.js';

// Routes
import settingsRoutes from './routes/settingsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import grnRoutes from './routes/grnRoutes.js';
import internalOpsRoutes from './routes/internalOpsRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import accountsRoutes from './routes/accounts/index.js';

const app = express();

// 1. SECURITY & CORE MIDDLEWARE
app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
);

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'Expires',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

// Safety net for double /api/api/ paths
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  next();
});

// OAuth Callback for Google Drive Backup
app.get('/api/backup/callback', handleCallback);

// 2. ROUTE MOUNTING
app.use('/api/auth', authRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/inventory/grn', grnRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/finance', financeRoutes);          // vendor-payment, customer-receipt, etc.
app.use('/api/sales', salesRoutes);              // includes /:id/partial-payment
app.use('/api/partners', partnerRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/internal-ops', internalOpsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/accounts', accountsRoutes);

// 3. HEALTH CHECKS
app.get('/health', (req, res) =>
    res.json({ status: 'online', system: 'ERP Core Engine', timestamp: new Date() })
);

app.get('/api/health', (req, res) =>
    res.json({ status: 'online', system: 'ERP Core Engine', timestamp: new Date() })
);

app.get('/api/db-test', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Database connection successful' });
  } catch (error) {
    next(error);
  }
});

// 4. 404 NOT FOUND HANDLER
app.use((req, res, next) => {
  const error = new Error(`Route ${req.method} ${req.url} not found`);
  error.statusCode = 404;
  next(error);
});

// 5. GLOBAL ERROR HANDLER
app.use(errorHandler);

// 6. SERVER STARTUP & LIFECYCLE
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

async function startServer() {
  const maxRetries = 12;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection verified.');
      break;
    } catch (error) {
      console.error(`❌ DB connection attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt === maxRetries) {
        console.error('❌ CRITICAL: Could not connect to database after all retries.');
        process.exit(1);
      }

      // wait before next try
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  });

  const shutdown = async () => {
    console.log('\n🛑 Shutting down server...');
    await prisma.$disconnect();
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Daily Google Drive Backup at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Starting daily scheduled Google Drive backup...');
  try {
    await runGoogleDriveBackup();
    console.log('✅ Daily automated backup complete.');
  } catch (error) {
    console.error('❌ Daily automated backup failed:', error.message);
  }
});

startServer();