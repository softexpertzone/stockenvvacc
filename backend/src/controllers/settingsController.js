import prisma from '../lib/prisma.js';
import { getEnabledModules } from '../middleware/moduleGuard.js';

const handleError = (res, error, message) => {
    console.error(`[SettingsController Error] ${message}:`, error);
    res.status(500).json({ error: message, details: error.message });
};

// ==========================================
// UOM Management
// ==========================================
export const getUoms = async (req, res) => {
    try {
        const uoms = await prisma.uomMaster.findMany({ orderBy: { name: 'asc' } });
        res.json(uoms);
    } catch (error) { handleError(res, error, "Failed to fetch UOMs"); }
};

export const createUom = async (req, res) => {
    try {
        const { name, symbol } = req.body;
        if (!name || !symbol) return res.status(400).json({ error: "Missing UOM details" });
        const uom = await prisma.uomMaster.create({ data: { name, symbol } });
        res.status(201).json(uom);
    } catch (error) { handleError(res, error, "Failed to create UOM"); }
};

// ==========================================
// Tax Management
// ==========================================
export const getTaxes = async (req, res) => {
    try {
        const taxes = await prisma.taxMaster.findMany({ orderBy: { name: 'asc' } });
        res.json(taxes);
    } catch (error) { handleError(res, error, "Failed to fetch Taxes"); }
};

export const createTax = async (req, res) => {
    try {
        const { name, percentage } = req.body;
        const tax = await prisma.taxMaster.create({
            data: { name, percentage: parseFloat(percentage) }
        });
        res.status(201).json(tax);
    } catch (error) { handleError(res, error, "Failed to create Tax"); }
};

// ==========================================
// Attribute Management
// ==========================================
export const getAttributes = async (req, res) => {
    try {
        const attributes = await prisma.attributeDefinition.findMany({
            include: { values: true },
            orderBy: { name: 'asc' }
        });
        res.json(attributes);
    } catch (error) { handleError(res, error, "Failed to fetch Attributes"); }
};

export const createAttribute = async (req, res) => {
    try {
        const { name, values } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Attribute name is required" });
        }

        const valueList = Array.isArray(values) ? values : [];

        const attribute = await prisma.attributeDefinition.create({
            data: {
                name: String(name).trim(),
                values: {
                    create: valueList
                        .filter(v => v && (v.value || typeof v === 'string'))
                        .map(v => ({
                            value: typeof v === 'string' ? v.trim() : String(v.value).trim(),
                            hexCode: (v && v.hexCode) || null
                        }))
                }
            },
            include: { values: true }
        });

        res.status(201).json(attribute);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: "An attribute with this name already exists."
            });
        }
        handleError(res, error, "Failed to create Attribute");
    }
};

// ==========================================
// Product Creation
// ==========================================
export const createProduct = async (req, res) => {
    try {
        const {
            name, sku, categoryId, brandId, subBrandId, uomId, taxId, partnerId, variants
        } = req.body;

        if (!sku || !categoryId || !brandId) {
            return res.status(400).json({ error: "SKU, Category, and Brand are mandatory." });
        }

        const newProduct = await prisma.product.create({
            data: {
                name,
                sku,
                categoryId,
                brandId,
                subBrandId,
                uomId,
                taxId,
                partnerId,
                productVariants: {
                    create: (variants || []).map(v => ({
                        sku: v.sku,
                        price: parseFloat(v.price),
                        purchasePrice: parseFloat(v.purchasePrice || 0),
                        attributes: v.attributes ? {
                            create: v.attributes.map(attr => ({
                                attributeDefId: attr.attributeDefId,
                                attributeValueId: attr.attributeValueId
                            }))
                        } : undefined
                    }))
                }
            },
            include: {
                productVariants: {
                    include: { attributes: true }
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                entity: 'Product',
                entityId: newProduct.id,
                action: 'CREATE',
                operation: 'NEW_PRODUCT_REGISTRATION',
                userId: req.user?.id || 'SYSTEM'
            }
        });

        res.status(201).json(newProduct);
    } catch (error) {
        handleError(res, error, "Failed to create product");
    }
};

export const getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({ include: { children: true } });
        res.json(categories);
    } catch (error) { handleError(res, error, "Failed to fetch Categories"); }
};

// ==========================================
// Add value to an existing attribute definition
// Route: POST /attributes/:id/values
// ==========================================
export const addAttributeValue = async (req, res) => {
    try {
        // Route is defined as /attributes/:id/values → req.params.id
        const attributeDefId =
            req.params?.id ||
            req.params?.attributeDefId ||
            req.params?.attributeId ||
            req.body?.attributeDefId;

        const { value, hexCode } = req.body || {};

        console.log("DEBUG: addAttributeValue", {
            params: req.params,
            attributeDefId,
            value,
            body: req.body
        });

        if (!attributeDefId) {
            return res.status(400).json({
                success: false,
                error: "Attribute definition id is missing from the URL.",
                debug: { params: req.params }
            });
        }

        if (!value || !String(value).trim()) {
            return res.status(400).json({
                success: false,
                error: "Attribute value is required"
            });
        }

        const trimmed = String(value).trim();

        // Verify parent attribute exists
        const parent = await prisma.attributeDefinition.findUnique({
            where: { id: attributeDefId }
        });
        if (!parent) {
            return res.status(404).json({
                success: false,
                error: "Attribute definition not found."
            });
        }

        // Prisma relation field is "definition" — use connect
        const newValue = await prisma.attributeValue.create({
            data: {
                value: trimmed,
                hexCode: hexCode || null,
                definition: {
                    connect: { id: attributeDefId }
                }
            }
        });

        return res.status(201).json(newValue);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: "This value already exists for this attribute.",
                message: "This value already exists for this attribute."
            });
        }
        handleError(res, error, "Failed to add attribute value");
    }
};

// ==========================================
// Return Reason Management
// ==========================================
export const getReturnReasons = async (req, res) => {
    try {
        const { type, isActive } = req.query;

        const where = {};
        if (type) {
            where.type = type.toUpperCase(); // PURCHASE | SALES | BOTH
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true' || isActive === true;
        }

        const reasons = await prisma.returnReasonMaster.findMany({
            where,
            orderBy: [{ type: 'asc' }, { code: 'asc' }],
        });

        res.json(reasons);
    } catch (error) {
        handleError(res, error, "Failed to fetch Return Reasons");
    }
};

export const createReturnReason = async (req, res) => {
    try {
        const { code, name, type, description, isActive = true } = req.body;

        if (!code || !name || !type) {
            return res.status(400).json({ error: "code, name and type are required" });
        }

        const normalizedCode = String(code).trim().toUpperCase();

        const existing = await prisma.returnReasonMaster.findUnique({
            where: { code: normalizedCode },
        });

        if (existing) {
            return res.status(409).json({
                error: `Return reason code "${normalizedCode}" already exists`,
            });
        }

        const reason = await prisma.returnReasonMaster.create({
            data: {
                code: normalizedCode,
                name: String(name).trim(),
                type: String(type).toUpperCase(),
                description: description ? String(description).trim() : null,
                isActive: Boolean(isActive),
            },
        });

        res.status(201).json(reason);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: "Return reason code already exists" });
        }
        handleError(res, error, "Failed to create Return Reason");
    }
};

export const updateReturnReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, description, isActive } = req.body;

        const data = {};
        if (name !== undefined) data.name = String(name).trim();
        if (type !== undefined) data.type = String(type).toUpperCase();
        if (description !== undefined) data.description = description ? String(description).trim() : null;
        if (isActive !== undefined) data.isActive = Boolean(isActive);

        const reason = await prisma.returnReasonMaster.update({
            where: { id },
            data,
        });

        res.json(reason);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Return reason not found" });
        }
        handleError(res, error, "Failed to update Return Reason");
    }
};

export const deleteReturnReason = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete (safer – keeps history)
        const reason = await prisma.returnReasonMaster.update({
            where: { id },
            data: { isActive: false },
        });

        res.json({ message: "Return reason deactivated", data: reason });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Return reason not found" });
        }
        handleError(res, error, "Failed to delete Return Reason");
    }
};

export const getModules = async (req, res) => {
    try {
        const modules = await getEnabledModules();

        return res.json({
            success: true,
            data: modules,
        });
    } catch (error) {
        console.error('Get Modules Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get modules',
        });
    }
};

// Get all module settings
export const getModuleSettings = async (req, res) => {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: {
                    startsWith: 'module_'
                }
            }
        });

        // Convert to easy object
        const modules = {
            accounts: settings.find(s => s.key === 'module_accounts')?.value === 'true',
            inventory: settings.find(s => s.key === 'module_inventory')?.value !== 'false', // default true
            purchase: settings.find(s => s.key === 'module_purchase')?.value !== 'false',
            sales: settings.find(s => s.key === 'module_sales')?.value !== 'false',
            warehouse: settings.find(s => s.key === 'module_warehouse')?.value !== 'false',
        };

        res.json({ success: true, data: modules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update module settings (Super Admin only)
export const updateModuleSettings = async (req, res) => {
    try {
        const { accounts, inventory, purchase, sales, warehouse } = req.body;

        const updates = [
            { key: 'module_accounts', value: String(!!accounts) },
            { key: 'module_inventory', value: String(!!inventory) },
            { key: 'module_purchase', value: String(!!purchase) },
            { key: 'module_sales', value: String(!!sales) },
            { key: 'module_warehouse', value: String(!!warehouse) },
        ];

        for (const item of updates) {
            await prisma.systemSetting.upsert({
                where: { key: item.key },
                update: { value: item.value },
                create: { key: item.key, value: item.value },
            });
        }

        res.json({
            success: true,
            message: 'Module settings updated successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};