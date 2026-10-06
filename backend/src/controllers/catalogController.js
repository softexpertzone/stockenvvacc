// controllers/catalogController.js
import catalogService from '../services/catalogService.js';
import prisma from '../lib/prisma.js';

/**
 * Standardized Response Helper
 * Ensures all API responses follow a predictable structure.
 */
const sendSuccess = (res, statusCode, data, message = "Operation successful") => {
    res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res, statusCode, message) => {
    res.status(statusCode).json({ success: false, message });
};

export const createProduct = async (req, res, next) => {
    try {
        // TRAP 1: See exactly what the frontend is sending
        console.log("\n==============================================");
        console.log("👉 1. REACHED CATALOG CONTROLLER - createProduct");
        console.log("👉 RECEIVED BODY:", JSON.stringify(req.body, null, 2));
        console.log("==============================================\n");

        const result = await catalogService.createProductWithVariants(req.body);

        console.log("👉 3. PRODUCT CREATED SUCCESSFULLY IN DATABASE!");
        sendSuccess(res, 201, result, "Product created successfully");
    } catch (error) {
        // Check for expected validation errors FIRST
        if (error.code === 'P2002') {
            console.log(`⚠️ Validation Error: SKU already exists.`);
            return sendError(res, 409, "SKU already exists.");
        }

        // Only log a massive crash for unexpected 500 errors
        console.error("\n❌❌❌ UNEXPECTED BACKEND CRASH ❌❌❌");
        console.error("Error Message:", error.message);
        console.error("Stack Trace:\n", error.stack);
        console.error("====================================================\n");

        next(error);
    }
};

export const createCategory = async (req, res, next) => {
    try {
        const category = await catalogService.createCategory(req.body);
        sendSuccess(res, 201, category, "Category created successfully");
    } catch (error) {
        if (error.code === 'P2002') return sendError(res, 409, error.message || "Category already exists.");
        next(error);
    }
};

export const createBrand = async (req, res, next) => {
    try {
        const newBrand = await catalogService.createBrand(req.body);
        sendSuccess(res, 201, newBrand, "Brand created successfully");
    } catch (error) {
        if (error.code === 'P2002') return sendError(res, 409, error.message || "Brand already exists.");
        next(error);
    }
};

export const getAllCategories = async (req, res, next) => {
    try {
        const categories = await catalogService.getAllCategories();
        sendSuccess(res, 200, categories);
    } catch (error) {
        next(error);
    }
};

export const getAllBrands = async (req, res, next) => {
    try {
        const brands = await catalogService.getAllBrands();
        sendSuccess(res, 200, brands);
    } catch (error) {
        next(error);
    }
};

export const getAllSuppliers = async (req, res, next) => {
    try {
        const suppliers = await catalogService.getAllSuppliers();
        sendSuccess(res, 200, suppliers);
    } catch (error) {
        next(error);
    }
};

export const createVariant = async (req, res, next) => {
    try {
        const variant = await catalogService.createVariant(req.body);
        sendSuccess(res, 201, variant, "Variant created successfully");
    } catch (error) {
        if (error.code === 'P2002') return sendError(res, 409, "This SKU already exists.");
        next(error);
    }
};

export const testConnection = async (req, res, next) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        sendSuccess(res, 200, { timestamp: new Date().toISOString() }, 'Database connection successful');
    } catch (error) {
        console.error('Connection test failed:', error);
        sendError(res, 500, 'Database connection failed');
    }
};

export const createAttributeDefinition = async (req, res, next) => {
    try {
        const definition = await catalogService.createAttributeDefinition(req.body);
        sendSuccess(res, 201, definition, "Attribute definition created successfully");
    } catch (error) {
        if (error.code === 'P2002') return sendError(res, 409, "Attribute name already exists.");
        next(error);
    }
};

export const getAllAttributeDefinitions = async (req, res, next) => {
    try {
        const definitions = await catalogService.getAllAttributeDefinitions();
        sendSuccess(res, 200, definitions);
    } catch (error) {
        next(error);
    }
};