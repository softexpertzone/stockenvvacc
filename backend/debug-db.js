// Import the existing prisma instance from your project
const prisma = require('./src/lib/prisma');

async function checkPOs() {
    console.log("Checking database for Purchase Orders...");

    try {
        const pos = await prisma.purchaseOrder.findMany({
            select: {
                id: true,
                purchaseNumber: true,
                status: true
            }
        });

        if (pos.length === 0) {
            console.log("⚠️ RESULT: No Purchase Orders found in database.");
        } else {
            console.log("✅ RESULT: Found " + pos.length + " Purchase Order(s):");
            console.log(JSON.stringify(pos, null, 2));
        }
    } catch (error) {
        console.error("Database Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPOs();