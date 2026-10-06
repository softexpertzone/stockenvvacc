const replenishmentService = require('../services/replenishmentService');

exports.getProcurementSuggestions = async (req, res) => {
    try {
        const suggestions = await replenishmentService.getReplenishmentSuggestions();
        res.status(200).json({ success: true, data: suggestions });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to generate procurement list" });
    }
};