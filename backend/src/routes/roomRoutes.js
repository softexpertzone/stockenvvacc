// E:\stockinventory\backend-erp\src\routes\roomRoutes.js
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, roomController.getAllRooms);

module.exports = router;