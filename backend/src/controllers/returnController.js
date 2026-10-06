import returnService from '../services/returnService.js';
import {
    createPurchaseReturnSchema,
    createCustomerReturnSchema,
} from '../validations/returnValidation.js';
import { AppError } from '../utils/responseHandler.js';

// ====================== PURCHASE RETURN ======================

export const createPurchaseReturn = async (req, res, next) => {
    try {
        // Validate request body with Zod
        const parsedData = createPurchaseReturnSchema.parse(req.body);

        // Temporary until JWT is fully ready
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

        const result = await returnService.createPurchaseReturn(parsedData, userId);

        res.status(201).json({
            success: true,
            message: 'Purchase Return created successfully',
            data: result,
        });
    } catch (error) {
        // Zod validation errors
        if (error.name === 'ZodError') {
            return next(
                new AppError(
                    (error.issues || error.errors || [])
                        .map((e) => e.message)
                        .join(', '),
                    400
                )
            );
        }
        next(error);
    }
};
export const confirmPurchaseReturn = async (req, res, next) => {
    try {
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

        const result = await returnService.confirmPurchaseReturn(req.params.id, userId);

        res.json({
            success: true,
            message: 'Purchase Return confirmed, stock deducted, and ledger updated',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getPurchaseReturns = async (req, res, next) => {
    try {
        const result = await returnService.getPurchaseReturns(req.query);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getPurchaseReturnById = async (req, res, next) => {
    try {
        const result = await returnService.getPurchaseReturnById(req.params.id);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

// ====================== CUSTOMER RETURN ======================

export const createCustomerReturn = async (req, res, next) => {
    try {
        const parsedData = createCustomerReturnSchema.parse(req.body);

        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

        const result = await returnService.createCustomerReturn(parsedData, userId);

        res.status(201).json({
            success: true,
            message: 'Customer Return created successfully',
            data: result,
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return next(
                new AppError(
                    (error.issues || error.errors || [])
                        .map((e) => e.message)
                        .join(', '),
                    400
                )
            );
        }
        next(error);
    }
};
export const receiveCustomerReturn = async (req, res, next) => {
    try {
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';
        const result = await returnService.receiveCustomerReturn(req.params.id, userId);
        res.json({
            success: true,
            message: 'Customer Return received. Stock updated according to disposition (restock / quarantine / scrap).',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};


export const getReturnableLinesFromSalesOrder = async (req, res, next) => {
    try {
        const result = await returnService.getReturnableLinesFromSalesOrder(req.params.id);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getCustomerReturns = async (req, res, next) => {
    try {
        const result = await returnService.getCustomerReturns(req.query);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getCustomerReturnById = async (req, res, next) => {
    try {
        const result = await returnService.getCustomerReturnById(req.params.id);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};