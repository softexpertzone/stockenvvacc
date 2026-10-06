import * as groupService from '../../services/accounts/groupService.js';
import { successResponse, errorResponse } from '../../utils/responseHandler.js';

export const getAllGroups = async (req, res, next) => {
    try {
        const { nature, search, isActive } = req.query;
        const groups = await groupService.getAllGroups({ nature, search, isActive });

        return successResponse(res, 'Account groups fetched successfully', groups);
    } catch (error) {
        next(error);
    }
};

export const getGroupTree = async (req, res, next) => {
    try {
        const tree = await groupService.getGroupTree();
        return successResponse(res, 'Account group tree fetched successfully', tree);
    } catch (error) {
        next(error);
    }
};

export const getGroupById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const group = await groupService.getGroupById(id);

        if (!group) {
            return errorResponse(res, 'Account group not found', 404);
        }

        return successResponse(res, 'Account group fetched successfully', group);
    } catch (error) {
        next(error);
    }
};

export const createGroup = async (req, res, next) => {
    try {
        const group = await groupService.createGroup(req.body);
        return successResponse(res, 'Account group created successfully', group, 201);
    } catch (error) {
        next(error);
    }
};

export const updateGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const group = await groupService.updateGroup(id, req.body);

        return successResponse(res, 'Account group updated successfully', group);
    } catch (error) {
        next(error);
    }
};

export const deleteGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        await groupService.deleteGroup(id);

        return successResponse(res, 'Account group deleted successfully');
    } catch (error) {
        next(error);
    }
};