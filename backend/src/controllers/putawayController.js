// src/controllers/putawayController.js
import { prisma } from '../lib/prisma.js';

export const commitPutaway = async (req, res) => {
    const { binId, productVariantId, weight, count, batchId } = req.body;

    try {
        // Atomic transaction: ensures full integrity
        await prisma.$transaction(async (tx) => {
            // 1. Verify capacity (re-check inside transaction)
            const occupancy = await tx.bin.findUnique({
                where: { id: binId },
                include: { inventoryBalances: true }
            });

            // Calculate current total weight in the bin
            const currentWeight = occupancy.inventoryBalances.reduce(
                (sum, b) => sum + Number(b.currentKg),
                0
            );

            if (Number(occupancy.maxWeightKg) - currentWeight < weight) {
                throw new Error("Capacity violation: Insufficient space in the target bin.");
            }

            // 2. Create Ledger entry
            await tx.stockLedger.create({
                data: {
                    productVariantId,
                    destinationBinId: binId,
                    quantityCount: count,
                    quantityKg: weight,
                    type: 'INITIAL_PO_RECEIVE',
                    reference: 'PUTAWAY'
                }
            });

            // 3. Update Inventory Balance
            await tx.inventoryBalance.upsert({
                where: {
                    productVariantId_binId_batchId: { productVariantId, binId, batchId }
                },
                create: { productVariantId, binId, batchId, currentCount: count, currentKg: weight },
                update: {
                    currentCount: { increment: count },
                    currentKg: { increment: weight }
                }
            });
        });

        return res.status(200).json({ success: true, message: "Stock committed successfully." });
    } catch (error) {
        console.error("Putaway Transaction Failed:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};