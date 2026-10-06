import { findBestBin } from '../utils/putAwayEngine.js';

// 1. Create a Mock Database Transaction (tx)
// This mimics the Prisma structure your engine expects
const mockTx = {
    productVariant: {
        findUnique: async () => ({
            id: 1,
            weightKg: 1,
            volumeCm3: 10,
            product: { categoryId: 99 }
        })
    },
    putAwayRule: {
        findFirst: async () => null // Simulating no specific rules for this test
    },
    inventoryBalance: {
        findFirst: async () => null // Simulating no existing stock
    },
    bin: {
        findMany: async () => [
            { id: 101, maxVolumeCm3: 100, currentVolume: 20, maxWeightKg: 50, currentWeight: 5 },
            { id: 102, maxVolumeCm3: 200, currentVolume: 50, maxWeightKg: 100, currentWeight: 10 }
        ]
    }
};

// 2. Define the test parameters
const params = {
    variantId: 1,
    quantity: 1,
    godownId: 1
};

// 3. Execute the function
async function runTest() {
    console.log("Running Put-Away Engine Test...");
    try {
        const result = await findBestBin(mockTx, params);
        console.log("----------------------------");
        console.log("Test Result Found Bin:", result ? result.id : "No bin found");
        console.log("----------------------------");
    } catch (error) {
        console.error("Test Failed with error:", error);
    }
}

runTest();