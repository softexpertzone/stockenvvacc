import express from 'express';
import * as salesController from '../controllers/salesController.js';
import { getProductsWithWarehouseStock } from '../controllers/inventoryController.js';
// import { authenticateToken } from '../middleware/authMiddleware.js'; // Disabled for dev mode

const router = express.Router();

// 1. SPECIFIC STATIC ROUTES MUST COME FIRST
router.get('/products-with-stock', getProductsWithWarehouseStock); // 👈 Use the imported function directly
router.get('/customers', salesController.getCustomers);
router.post('/customers', salesController.createCustomer);
router.get('/pending-dispatch', salesController.getPendingDispatches);

// Checkout & Processing Actions
router.post('/checkout', salesController.checkoutSale);
router.post('/new', salesController.checkoutSale); // Alias
router.post('/confirm', salesController.checkoutSale); // Alias for checkout
router.post('/dispatch', salesController.dispatchOrder);

// Partial / Full Sales Payment
router.post('/:id/partial-payment', salesController.recordPartialPayment);

// Sales Orders List (Supports both /api/sales and /api/sales/orders)
router.get('/', salesController.getSalesOrders);
router.get('/orders', salesController.getSalesOrders);

// 2. PARAMETERIZED ROUTE MUST COME LAST
router.get('/:id', salesController.getSalesOrderById);

export default router;