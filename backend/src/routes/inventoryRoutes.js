import express from 'express';
import {
    getInventory,
    updateStock,
    getProducts,
    getSuggestedBins,
    executeTransfer,
    getWarehouseLayout,
    getLedgerHistory,
    getGodowns,
    suggestTransferPlan,
    getInventoryLevels,
    getDetailedInventory,
    getStockBalances
} from '../controllers/inventoryController.js';

import { getBatches } from '../controllers/batchController.js'; // ← add this
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// 🚀 ACTIVE APPLICATION ROUTES
// ==========================================

// 1. Get real-time stock: GET /api/inventory/
router.get('/', authenticateToken, getInventory);

// 1b. Get Inventory Levels: GET /api/inventory/levels
router.get('/levels', authenticateToken, getInventoryLevels);

// 1c. Get Detailed Inventory: GET /api/inventory/detailed
router.get('/detailed', authenticateToken, getDetailedInventory);

// 1d. Get Stock Balances: GET /api/inventory/stock-balances
router.get('/stock-balances', authenticateToken, getStockBalances);

// 1e. Get Batches by Product: GET /api/inventory/batches
router.get('/batches', authenticateToken, getBatches);   // ← added

// 2. Get Godowns: GET /api/inventory/godowns
router.get('/godowns', authenticateToken, getGodowns);

// 3. Stock Adjustment: POST /api/inventory/adjust
router.post('/adjust', authenticateToken, updateStock);

// 4. Products List: GET /api/inventory/products
router.get('/products', authenticateToken, getProducts);

// 5. Execute Internal Transfers: POST /api/inventory/transfer
router.post('/transfer', authenticateToken, executeTransfer);

// 5b. Suggest Transfer Plan: GET /api/inventory/transfer/suggest-plan
router.get('/transfer/suggest-plan', authenticateToken, suggestTransferPlan);

// 6. Ledger History: GET /api/inventory/ledger-data
router.get('/ledger-data', authenticateToken, getLedgerHistory);

// 7. Warehouse Layout Map: GET /api/inventory/layout
router.get('/layout', authenticateToken, getWarehouseLayout);

// 8. Slotting Engine: GET /api/inventory/suggest-bin
router.get('/suggest-bin', authenticateToken, getSuggestedBins);

export default router;