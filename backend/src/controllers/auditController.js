const auditService = require('../services/auditService');
const { stockAdjustmentSchema } = require('../validations/auditValidation');

exports.processAdjustment = async (req, res) => {
    try {
        const validated = stockAdjustmentSchema.parse(req.body);
        const result = await auditService.reconcileStock(validated, req.user?.id);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};