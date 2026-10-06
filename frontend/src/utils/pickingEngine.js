// src/utils/pickingEngine.js

/**
 * Intelligent Picking Engine
 * Logic: FEFO (First-Expired, First-Out) -> FIFO -> Available Quantity
 * @param {object} tx - The Prisma transaction instance
 * @param {object} params - { productVariantId, quantity }
 */
export const findPickingStrategy = async (tx, { productVariantId, quantity }) => {

    // 1. Fetch available stock, prioritizing batches with earlier expiry dates
    // We must exclude inventory already 'allocated' to other orders
    const availableStock = await tx.inventoryBalance.findMany({
        where: {
            productVariantId,
            isActive: true,
            currentCount: { gt: 0 } // Must have stock
        },
        include: {
            batch: true,
            bin: true
        },
        // INDUSTRY STANDARD: FEFO (Expiry ASC) then FIFO (Created ASC)
        orderBy: [
            { batch: { expiryDate: 'asc' } },
            { createdAt: 'asc' }
        ]
    });

    // Calculate actual availability (Current - Allocated)
    const candidates = availableStock.map(inv => ({
        ...inv,
        availableForPick: inv.currentCount - inv.allocatedCount
    })).filter(inv => inv.availableForPick > 0);

    // 2. Validate total system-wide availability
    const totalAvailable = candidates.reduce((sum, inv) => sum + inv.availableForPick, 0);
    if (totalAvailable < quantity) {
        throw new Error(`Insufficient stock for picking. Requested: ${quantity}, Available: ${totalAvailable}`);
    }

    // 3. Build Picking Instructions
    let remainingToPick = quantity;
    const pickingInstructions = [];

    for (const item of candidates) {
        if (remainingToPick <= 0) break;

        const pickFromThisBin = Math.min(item.availableForPick, remainingToPick);

        pickingInstructions.push({
            binId: item.binId,
            binName: item.bin.name,
            batchId: item.batchId,
            batchNumber: item.batch.batchNumber,
            quantity: pickFromThisBin
        });

        remainingToPick -= pickFromThisBin;
    }

    return pickingInstructions;
};