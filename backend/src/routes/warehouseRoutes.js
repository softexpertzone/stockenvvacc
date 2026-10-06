import express from 'express';
import * as warehouseController from '../controllers/warehouseController.js';
import * as putawayRuleController from '../controllers/putawayRuleController.js';
import { getRoomsByGodown, getRacksByRoom } from '../controllers/warehouseController.js';

const router = express.Router();

// 1. UNIFIED LAYOUT MANAGER
router.get('/setup', warehouseController.getWarehouseHierarchy);
router.post('/setup', warehouseController.handleUnifiedSetup);

// 2. WAREHOUSE HIERARCHY CRUD ROUTES
router.post('/godowns', warehouseController.addGodown);
router.get('/godowns', warehouseController.getGodowns);
router.put('/godowns/:id', warehouseController.updateGodown);
router.delete('/godowns/:id', warehouseController.deleteGodown);

router.post('/zones', warehouseController.addZone);
router.put('/zones/:id', warehouseController.updateZone);
router.delete('/zones/:id', warehouseController.deleteZone);

router.post('/rooms', warehouseController.addRoom);
router.put('/rooms/:id', warehouseController.updateRoom);
router.delete('/rooms/:id', warehouseController.deleteRoom);

// 3. PUT-AWAY RULES MANAGER
router.post('/rules', putawayRuleController.addRule);
router.get('/rules', putawayRuleController.getRules);
router.put('/rules/:id', putawayRuleController.updateRule);
router.delete('/rules/:id', putawayRuleController.deleteRule);

router.get('/godowns/:godownId/rooms', getRoomsByGodown);
router.get('/rooms/:roomId/racks', getRacksByRoom);
router.get('/racks/:rackId/bins', warehouseController.getBinsByRack);

// --- Hierarchy Levels 5-8 ---
router.post('/aisles', warehouseController.addAisle);
router.put('/aisles/:id', warehouseController.updateAisle);
router.delete('/aisles/:id', warehouseController.deleteAisle);

router.post('/racks', warehouseController.addRack);
router.put('/racks/:id', warehouseController.updateRack);
router.delete('/racks/:id', warehouseController.deleteRack);

router.post('/shelves', warehouseController.addShelf);
router.put('/shelves/:id', warehouseController.updateShelf);
router.delete('/shelves/:id', warehouseController.deleteShelf);

router.post('/bins', warehouseController.addBin);
router.put('/bins/:id', warehouseController.updateBin);
router.delete('/bins/:id', warehouseController.deleteBin);

// 4. SMART PLACEMENT, MAP & INVENTORY ROUTES
router.get('/hierarchy', warehouseController.getGodowns);
router.get('/stock-levels', warehouseController.getStockLevels);
router.post('/stock/move', warehouseController.moveStock);

// --- Purchase Order & GRN Search Route ---
router.get('/po-search/:poNumber', warehouseController.searchByPurchaseOrder);

// --- Smart Bin Suggestion Engine (Supports both GET & POST) ---
router.all('/suggest-bin', (req, res, next) => {
    if (req.method === 'GET') {
        req.body = {
            variantId: req.query.variantId || req.query.productId,
            warehouseId: req.query.warehouseId
        };
    }
    const targetId = req.body.variantId || req.query.variantId || req.query.productId;
    if (!targetId) {
        return res.status(400).json({ error: "variantId or productId is required" });
    }
    next();
}, warehouseController.suggestBin);

// --- Reserve-to-Commit Workflow ---
router.post('/putaway/commit',
    (req, res, next) => {
        const { variantId, binId, quantity } = req.body;
        if (!variantId || !binId || !quantity) {
            return res.status(400).json({ error: "variantId, binId, and quantity are required to commit." });
        }
        next();
    },
    warehouseController.commitPutAway
);

export default router;