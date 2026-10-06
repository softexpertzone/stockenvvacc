import express from 'express';
import {
    createPurchaseReturn,
    confirmPurchaseReturn,
    getPurchaseReturns,
    getPurchaseReturnById,
    createCustomerReturn,
    receiveCustomerReturn,
    getCustomerReturns,
    getCustomerReturnById,
    getReturnableLinesFromSalesOrder,   // ← new
} from '../controllers/returnController.js';

const router = express.Router();

// ====================== PURCHASE RETURNS ======================
router.post('/purchase', createPurchaseReturn);
router.get('/purchase', getPurchaseReturns);
router.get('/purchase/:id', getPurchaseReturnById);
router.patch('/purchase/:id/confirm', confirmPurchaseReturn);

// ====================== CUSTOMER RETURNS ======================
router.post('/customer', createCustomerReturn);
router.get('/customer', getCustomerReturns);
router.get('/customer/:id', getCustomerReturnById);
router.post('/customer/:id/receive', receiveCustomerReturn);

// New endpoint – load returnable lines from a Sales Order
router.get('/customer/from-sales-order/:id', getReturnableLinesFromSalesOrder);

export default router;