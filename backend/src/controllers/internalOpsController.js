import * as internalOpsService from '../services/internalOpsService.js';

export const handleTransfer = async (req, res) => {
    try {
        const { variantId, sourceBinId, targetBinId, quantityCount } = req.body;
        const userId = req.user?.id;          // ← no more fake ID

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!variantId || !sourceBinId || !targetBinId || !quantityCount) {
            return res.status(400).json({ success: false, message: "Missing required transfer parameters." });
        }

        const logRecord = await internalOpsService.transferStock({
            variantId, sourceBinId, targetBinId, quantityCount, userId
        });

        return res.status(200).json({ success: true, message: "Stock transferred successfully.", data: logRecord });
    } catch (error) {
        console.error("[Transfer Error]:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const handleAdjustment = async (req, res) => {
    try {
        const { variantId, binId, actualPhysicalCount, reason } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!variantId || !binId || typeof actualPhysicalCount !== 'number' || !reason) {
            return res.status(400).json({ success: false, message: "Missing required adjustment parameters." });
        }

        const logRecord = await internalOpsService.adjustStock({
            variantId, binId, actualPhysicalCount, reason, userId
        });

        return res.status(200).json({ success: true, message: "Stock adjusted successfully.", data: logRecord });
    } catch (error) {
        console.error("[Adjustment Error]:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const handleBulkReclassification = async (req, res) => {
    try {
        const { godownId, items } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!godownId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required reclassification parameters (godownId and items array)."
            });
        }

        const result = await internalOpsService.processBulkSortingReevaluation({ godownId, items }, userId);

        return res.status(201).json({
            success: true,
            message: "Bulk stock sorting re-evaluation completed successfully.",
            data: result
        });
    } catch (error) {
        console.error("[Bulk Reclassification Error]:", error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};