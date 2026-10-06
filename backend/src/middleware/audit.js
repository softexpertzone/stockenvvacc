// src/middleware/audit.js
import { prisma } from '../lib/prisma.js';

export const audit = (actionType) => async (req, res, next) => {
    // We capture the "Before" state (optional: fetch records here if needed)
    const startTime = Date.now();

    // Hook into the response to capture completion
    res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                await prisma.auditLog.create({
                    data: {
                        userId: req.user?.id || 'SYSTEM', // If auth is enabled
                        action: actionType, // e.g., 'STOCK_TRANSFER'
                        entityId: req.body.productVariantId || req.body.salesOrderId,
                        payload: JSON.stringify(req.body),
                        timestamp: new Date(),
                        statusCode: res.statusCode
                    }
                });
            } catch (err) {
                console.error("Audit log failed to write:", err);
            }
        }
    });

    next();
};