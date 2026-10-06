// src/services/transferService.js
import { prisma } from '../lib/prisma.js';
import { executeStockMove } from './stockService.js';

export const executeTransfer = async (data) => {
    return await prisma.$transaction(async (tx) => {

        // 1. PRE-FLIGHT CHECK: Ensure source has enough stock
        // We do this check here before invoking the 'stockMove' engine
        const currentBalance = await tx.inventoryBalance.findUnique({
            where: {
                productVariantId_rackId: {
                    productVariantId: data.productVariantId,
                    rackId: data.sourceRackId
                }
            }
        });

        if (!currentBalance || currentBalance.currentCount < data.quantityCount) {
            throw new Error(`Insufficient stock on Source Rack. Available: ${currentBalance?.currentCount || 0}`);
        }

        // 2. DELEGATE: Use the centralized stock engine
        // This keeps your logic DRY (Don't Repeat Yourself)
        return await executeStockMove(tx, {
            sourceBinId: data.sourceRackId, // Mapping rackId to binId convention
            destBinId: data.destinationRackId,
            productVariantId: data.productVariantId,
            batchId: data.batchId || null,
            weight: data.quantityKg,
            quantity: data.quantityCount,
            type: 'TRANSFER',
            reference: `TRANSFER-${Date.now()}`,
            notes: data.notes || "Inter-Rack Transfer"
        });
    });
};