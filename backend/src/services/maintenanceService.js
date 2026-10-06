// C:\stockinventory\backend\src\services\maintenanceService.js
const prisma = require('../lib/prisma');

/**
 * Synchronizes bin capacity based on currently stored inventory.
 * Useful for one-time calibration or after large bulk operations.
 */
exports.syncBinCapacity = async () => {
    const bins = await prisma.bin.findMany({
        include: {
            inventoryBalances: {
                include: { productVariant: true }
            }
        }
    });

    for (const bin of bins) {
        let totalW = 0, totalV = 0;
        for (const item of bin.inventoryBalances) {
            totalW += (Number(item.quantity) * Number(item.productVariant.weightKg || 0));
            totalV += (Number(item.quantity) * Number(item.productVariant.volumeCm3 || 0));
        }

        await prisma.bin.update({
            where: { id: bin.id },
            data: {
                currentWeight: totalW,
                currentVolume: totalV
            }
        });
    }
    return { success: true, binsProcessed: bins.length };
};