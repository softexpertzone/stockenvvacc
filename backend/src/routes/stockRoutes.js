const express = require('express');
const router = express.Router();
const stockOps = require('../controllers/stockOpsController');

router.post('/transfer', stockOps.handleTransfer);
// Add routes for processSale and receiveStock similarly
module.exports = router;