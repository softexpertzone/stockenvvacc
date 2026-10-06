import express from 'express';
import * as financeController from '../controllers/financeController.js';
import * as paymentController from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Existing finance summary / transactions ──────────────────────────
router.post('/', authenticateToken, financeController.createTransaction);
router.get('/', authenticateToken, financeController.getFinanceSummary);

// ── Vendor payment (Purchase – partial / full) ───────────────────────
// Body: { poId, amountPaid, paymentMethod, paymentReference, notes }
router.post(
    '/vendor-payment',
    authenticateToken,
    paymentController.recordVendorPayment
);

// ── Customer receipt (Sales – partial / full) ────────────────────────
// Body: { salesOrderId, amountReceived, paymentMethod, paymentReference, notes }
router.post(
    '/customer-receipt',
    authenticateToken,
    paymentController.recordCustomerReceipt
);

// ── Payment history for a PO or Sales Order ──────────────────────────
// GET /api/finance/payments/:type/:id
// type = PURCHASE_ORDER | SALES_ORDER
router.get(
    '/payments/:type/:id',
    authenticateToken,
    paymentController.getPaymentHistory
);

// ── Partner statement (customer / vendor) ────────────────────────────
// GET /api/finance/statement/:partnerId
router.get(
    '/statement/:partnerId',
    authenticateToken,
    paymentController.getPartnerStatement
);

export default router;