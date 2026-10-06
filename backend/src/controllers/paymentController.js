import prisma from '../lib/prisma.js';
import { createPurchasePaymentAccountingEntries } from '../services/accounts/inventoryBridge.js';
import * as financeService from '../services/financeService.js';

export const recordVendorPayment = async (req, res) => {
    try {
        const result = await financeService.recordVendorPayment({
            ...req.body,
            userId: req.user?.id,
        });
        res.status(200).json({
            success: true,
            message: 'Vendor payment recorded',
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

export const recordCustomerReceipt = async (req, res) => {
    try {
        const result = await financeService.recordCustomerReceipt({
            ...req.body,
            userId: req.user?.id,
        });
        res.status(200).json({
            success: true,
            message: 'Customer receipt recorded',
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

export const getPaymentHistory = async (req, res) => {
    try {
        const { type, id } = req.params; // type = PURCHASE_ORDER | SALES_ORDER
        const history = await financeService.getPaymentHistory(type, id);
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

export const getPartnerStatement = async (req, res) => {
    try {
        const statement = await financeService.getPartnerStatement(
            req.params.partnerId
        );
        res.json({ success: true, data: statement });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};