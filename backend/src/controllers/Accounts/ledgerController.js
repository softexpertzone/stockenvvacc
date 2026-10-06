import * as ledgerService from '../../services/accounts/ledgerService.js';
import { successResponse, errorResponse } from '../../utils/responseHandler.js';

export const getAllLedgers = async (req, res, next) => {
    try {
        const { groupId, ledgerType, search, isActive, page = 1, limit = 50 } = req.query;

        const result = await ledgerService.getAllLedgers({
            groupId,
            ledgerType,
            search,
            isActive,
            page: Number(page),
            limit: Number(limit),
        });

        return successResponse(res, 'Ledgers fetched successfully', result);
    } catch (error) {
        next(error);
    }
};

export const getLedgerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ledger = await ledgerService.getLedgerById(id);

        if (!ledger) {
            return errorResponse(res, 'Ledger not found', 404);
        }

        return successResponse(res, 'Ledger fetched successfully', ledger);
    } catch (error) {
        next(error);
    }
};

export const createLedger = async (req, res, next) => {
    try {
        const ledger = await ledgerService.createLedger(req.body);
        return successResponse(res, 'Ledger created successfully', ledger, 201);
    } catch (error) {
        next(error);
    }
};

export const updateLedger = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ledger = await ledgerService.updateLedger(id, req.body);

        return successResponse(res, 'Ledger updated successfully', ledger);
    } catch (error) {
        next(error);
    }
};

export const deleteLedger = async (req, res, next) => {
    try {
        const { id } = req.params;
        await ledgerService.deleteLedger(id);

        return successResponse(res, 'Ledger deleted successfully');
    } catch (error) {
        next(error);
    }
};

export const getLedgerBalance = async (req, res, next) => {
    try {
        const { id } = req.params;
        const balance = await ledgerService.getLedgerBalance(id);

        return successResponse(res, 'Ledger balance fetched successfully', balance);
    } catch (error) {
        next(error);
    }
};