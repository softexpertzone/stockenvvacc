import * as reportService from '../../services/accounts/reportService.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getTrialBalance = async (req, res, next) => {
    try {
        const { asOnDate, financialYear } = req.query;
        const data = await reportService.getTrialBalance({ asOnDate, financialYear });

        return successResponse(res, 'Trial Balance generated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getProfitAndLoss = async (req, res, next) => {
    try {
        const { fromDate, toDate, financialYear } = req.query;
        const data = await reportService.getProfitAndLoss({ fromDate, toDate, financialYear });

        return successResponse(res, 'Profit & Loss statement generated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getBalanceSheet = async (req, res, next) => {
    try {
        const { asOnDate, financialYear } = req.query;
        const data = await reportService.getBalanceSheet({ asOnDate, financialYear });

        return successResponse(res, 'Balance Sheet generated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getGeneralLedger = async (req, res, next) => {
    try {
        const { ledgerId, fromDate, toDate } = req.query;
        const data = await reportService.getGeneralLedger({ ledgerId, fromDate, toDate });

        return successResponse(res, 'General Ledger generated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getVoucherLedger = async (req, res, next) => {
    try {
        const { voucherType, fromDate, toDate, page = 1, limit = 50 } = req.query;

        const data = await reportService.getVoucherLedger({
            voucherType,
            fromDate,
            toDate,
            page: Number(page),
            limit: Number(limit),
        });

        return successResponse(res, 'Voucher Ledger generated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getCashFlow = async (req, res, next) => {
    try {
        const { fromDate, toDate } = req.query;

        const data = await reportService.getCashFlow({ fromDate, toDate });

        return successResponse(res, 'Cash Flow statement generated successfully', data);
    } catch (error) {
        next(error);
    }
};