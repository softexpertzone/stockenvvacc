const inventoryService = require('../services/inventoryService');

/**
 * Handle stock transfer between racks
 */
exports.handleTransfer = async (req, res) => {
    try {
        const { variantId, fromRackId, toRackId, qty, kg } = req.body;

        if (!variantId || !fromRackId || !toRackId || (!qty && !kg)) {
            return res.status(400).json({ success: false, error: "Missing required transfer fields" });
        }

        const result = await inventoryService.transferStock(variantId, fromRackId, toRackId, qty, kg);
        res.status(200).json({ success: true, data: result, message: "Stock transferred successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * Handle adding new stock (Inbound)
 */
exports.handleAddStock = async (req, res) => {
    try {
        const { variantId, rackId, qty, kg } = req.body;
        const result = await inventoryService.addStock(variantId, rackId, qty, kg);
        res.status(201).json({ success: true, data: result, message: "Stock added successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * Handle stock removal (Outbound/Sales)
 */
exports.handleRemoveStock = async (req, res) => {
    try {
        const { variantId, rackId, qty, kg } = req.body;
        const result = await inventoryService.removeStock(variantId, rackId, qty, kg);
        res.status(200).json({ success: true, data: result, message: "Stock removed successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};