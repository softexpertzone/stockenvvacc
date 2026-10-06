import * as chartOfAccountsService from '../../services/accounts/chartOfAccountsService.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getChartOfAccounts = async (req, res, next) => {
    try {
        const { nature } = req.query;
        const chart = await chartOfAccountsService.getChartOfAccounts(nature);

        return successResponse(res, 'Chart of Accounts fetched successfully', chart);
    } catch (error) {
        next(error);
    }
};