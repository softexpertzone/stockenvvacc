import * as voucherService from '../../services/accounts/voucherService.js';
import { successResponse, errorResponse } from '../../utils/responseHandler.js';

export const getAllVouchers = async (req, res, next) => {
    try {
        const { type, status, fromDate, toDate, page = 1, limit = 20, search } = req.query;

        const result = await voucherService.getAllVouchers({
            type,
            status,
            fromDate,
            toDate,
            page: Number(page),
            limit: Number(limit),
            search,
        });

        return successResponse(res, 'Vouchers fetched successfully', result);
    } catch (error) {
        next(error);
    }
};

export const getVoucherById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const voucher = await voucherService.getVoucherById(id);

        if (!voucher) {
            return errorResponse(res, 'Voucher not found', 404);
        }

        return successResponse(res, 'Voucher fetched successfully', voucher);
    } catch (error) {
        next(error);
    }
};

export const createVoucher = async (req, res, next) => {
    try {
        const voucher = await voucherService.createVoucher(req.body, req.user?.id);

        return successResponse(res, 'Voucher created successfully', voucher, 201);
    } catch (error) {
        next(error);
    }
};

export const updateVoucher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const voucher = await voucherService.updateVoucher(id, req.body);

        return successResponse(res, 'Voucher updated successfully', voucher);
    } catch (error) {
        next(error);
    }
};

export const postVoucher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const voucher = await voucherService.postVoucher(id, req.user?.id);

        return successResponse(res, 'Voucher posted successfully', voucher);
    } catch (error) {
        next(error);
    }
};

export const cancelVoucher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const voucher = await voucherService.cancelVoucher(id, reason, req.user?.id);

        return successResponse(res, 'Voucher cancelled successfully', voucher);
    } catch (error) {
        next(error);
    }
};

export const deleteVoucher = async (req, res, next) => {
    try {
        const { id } = req.params;
        await voucherService.deleteVoucher(id);

        return successResponse(res, 'Voucher deleted successfully');
    } catch (error) {
        next(error);
    }
};