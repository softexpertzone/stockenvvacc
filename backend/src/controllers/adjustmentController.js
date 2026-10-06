// src/controllers/adjustmentController.js
import { prisma } from '../lib/prisma.js';
import { executeStockMove } from '../services/stockService.js';

export const adjustStock = async (req, res) => {
    try {
        const { binId, productVariantId, batchId, quantity, weight, reason, notes } = req.body;

        // Determine if this is an INFLOW (Found) or OUTFLOW (Lost/Damaged)
        const isPositive = quantity > 0;

        const result = await prisma.$transaction(async (tx) => {
            return await executeStockMove(tx, {
                // If positive, we are "adding" to a bin (Source is null)
                // If negative, we are "removing" from a bin (Dest is null)
                sourceBinId: isPositive ? null : binId,
                destBinId: isPositive ? binId : null,

                productVariantId,
                batchId: batchId || null,
                weight: Math.abs(weight),
                quantity: Math.abs(quantity),
                type: 'ADJUSTMENT', // Critical for auditing
                reference: `ADJ-${reason}-${Date.now()}`,
                notes: `Reason: ${reason}. ${notes || ''}`
            });
        });

        return res.status(200).json({
            success: true,
            message: `Stock ${isPositive ? 'added' : 'removed'} successfully.`,
            data: result
        });
    } catch (error) {
        console.error("Adjustment Error:", error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};