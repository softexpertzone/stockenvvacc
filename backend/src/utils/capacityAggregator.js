// src/utils/capacityAggregator.js

/**
 * Aggregates weights and volumes from Bins up to Shelf, and from Shelves up to Rack.
 */
export async function aggregateCapacityUpwards(tx, shelfId) {
    // 1. Fetch all sister bins under this Shelf and sum their current load
    const sisterBins = await tx.bin.findMany({
        where: { shelfId }
    });

    const shelfWeightSum = sisterBins.reduce((sum, b) => sum + parseFloat(b.currentWeight || 0), 0);
    const shelfVolumeSum = sisterBins.reduce((sum, b) => sum + parseFloat(b.currentVolume || 0), 0);

    // 2. Update the Shelf load metrics
    const updatedShelf = await tx.shelf.update({
        where: { id: shelfId },
        data: {
            currentWeight: shelfWeightSum,
            currentVolume: shelfVolumeSum
        },
        select: { rackId: true }
    });

    const rackId = updatedShelf.rackId;

    // 3. Fetch all sister shelves under the parent Rack
    const sisterShelves = await tx.shelf.findMany({
        where: { rackId }
    });

    const rackWeightSum = sisterShelves.reduce((sum, s) => sum + parseFloat(s.currentWeight || 0), 0);
    const rackVolumeSum = sisterShelves.reduce((sum, s) => sum + parseFloat(s.currentVolume || 0), 0);

    // 4. Update the Rack load metrics
    await tx.rack.update({
        where: { id: rackId },
        data: {
            currentWeight: rackWeightSum,
            currentVolume: rackVolumeSum
        }
    });

    console.log(`📦 Capacity Aggregated Upwards: Shelf Weight ${shelfWeightSum}kg | Rack Weight ${rackWeightSum}kg`);
}