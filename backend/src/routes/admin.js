const express = require('express');
const router = express.Router();
const maintenanceService = require('../services/maintenanceService');

// POST /api/admin/sync-capacity
router.post('/sync-capacity', async (req, res) => {
    try {
        const result = await maintenanceService.syncBinCapacity();
        res.status(200).json({ success: true, message: "Calibration complete.", data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: "Sync failed: " + error.message });
    }
});

module.exports = router;