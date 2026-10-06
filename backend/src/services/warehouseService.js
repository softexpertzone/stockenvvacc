const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Helper function to safely convert Prisma Decimals to native JS numbers
 */
const safeNumber = (val) => {
    if (!val) return 0;
    return typeof val.toNumber === 'function' ? val.toNumber() : Number(val);
};

const WarehouseService = {

    /**
     * Retrieves the full hierarchical map of the warehouse.
     * NOTE: Consider lazy-loading this in the future if the DB gets too large.
     */
    async getWarehouseMap() {
        return await prisma.godown.findMany({
            include: {
                zones: {
                    include: {
                        rooms: {
                            include: {
                                aisles: {
                                    include: {
                                        racks: {
                                            include: {
                                                shelves: {
                                                    include: { bins: true }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Calculates current weight utilization of a bin
     */
    async getBinOccupancy(binId) {
        const bin = await prisma.bin.findUnique({
            where: { id: binId },
            include: { inventoryBalances: true }
        });

        if (!bin) throw new Error(`Bin with ID ${binId} not found`);

        // Safely sum up current weight using the helper
        const currentWeight = bin.inventoryBalances.reduce((sum, item) => {
            return sum + safeNumber(item.currentKg);
        }, 0);

        const maxWeight = safeNumber(bin.maxWeightKg);

        return {
            id: bin.id,
            name: bin.name,
            currentWeight,
            maxWeight,
            remainingCapacity: maxWeight - currentWeight,
            isFull: currentWeight >= maxWeight
        };
    },

    /**
     * Suggests the best bin based on remaining capacity
     */
    async suggestBestBin(requiredWeight) {
        const numericRequiredWeight = safeNumber(requiredWeight);

        // 1. DATABASE-LEVEL FILTER:
        // We only fetch bins that meet the theoretical weight threshold.
        // This prevents loading thousands of bins into Node.js memory.
        const candidates = await prisma.bin.findMany({
            where: {
                maxWeightKg: { gte: numericRequiredWeight }
            },
            include: { inventoryBalances: true }
        });

        // 2. APPLICATION-LEVEL PROCESSING:
        // Only perform calculations on the filtered, manageable subset of bins.
        const sortedBins = candidates
            .map(bin => {
                const currentWeight = bin.inventoryBalances.reduce((sum, b) => sum + safeNumber(b.currentKg), 0);
                const maxWeight = safeNumber(bin.maxWeightKg);
                return {
                    ...bin,
                    currentWeight,
                    remainingCapacity: maxWeight - currentWeight
                };
            })
            .filter(bin => bin.remainingCapacity >= numericRequiredWeight)
            .sort((a, b) => b.remainingCapacity - a.remainingCapacity);
        // Note: Sorts by empty-space descending (Emptiest bin first)

        return sortedBins.length > 0 ? sortedBins[0] : null;
    },

    /**
     * Validates if a specific bin can accept a new shipment
     */
    async canFit(binId, incomingWeight) {
        const occupancy = await this.getBinOccupancy(binId);
        return (occupancy.remainingCapacity >= safeNumber(incomingWeight));
    }
};

module.exports = WarehouseService;