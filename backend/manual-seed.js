// manual-seed.js
require('dotenv').config();
const prisma = require('./src/config/db'); // Use your existing configured instance

async function runSeed() {
  try {
    console.log("🌱 Injecting master taxonomy via existing Driver Adapter...");

    // 1. Clear out potential existing keys
    await prisma.brand.deleteMany({
      where: { id: { in: ['b1', 'b2', 'b3'] } }
    });

    // 2. Insert master brand tiers
    await prisma.brand.createMany({
      data: [
        {
          id: "b1",
          name: "Logitech Enterprise",
          description: "Global peripheral parent entity",
          code: "LOGITECH" // Added
        },
        {
          id: "b2",
          name: "Samsung Semiconductor",
          description: "Global hardware component parent",
          code: "SAMSUNG" // Added
        },
        {
          id: "b3",
          name: "Industrial Polymer Corp",
          description: "Raw material production corporate",
          code: "POLYMER" // Added
        }
      ]
    })

    console.log("✅ Success! Master brands are now in your PostgreSQL database.");
    process.exit(0); // Exit cleanly
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

runSeed();