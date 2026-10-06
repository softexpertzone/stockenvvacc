const { Client } = require('pg');

async function runDirectSeed() {
  const client = new Client({
    connectionString: "postgresql://postgres:Dhaka@1230@localhost:5432/stkenv2026?schema=public"
  });

  try {
    await client.connect();
    console.log("🔗 Connected directly to PostgreSQL...");

    // Clear old data
    await client.query(`DELETE FROM "Brand" WHERE id IN ('b1', 'b2', 'b3')`);

    // Insert new data with timestamps AND the required "code" column
    await client.query(`
      INSERT INTO "Brand" (id, name, description, code, "createdAt", "updatedAt") VALUES
                                                                                    ('b1', 'Logitech Enterprise', 'Global peripheral parent entity', 'LOGITECH', NOW(), NOW()),
                                                                                    ('b2', 'Samsung Semiconductor', 'Global hardware component parent', 'SAMSUNG', NOW(), NOW()),
                                                                                    ('b3', 'Industrial Polymer Corp', 'Raw material production corporate', 'POLYMER', NOW(), NOW())
    `);

    console.log("✅ Data injected successfully with timestamps and codes!");
  } catch (err) {
    console.error("❌ Direct seed failed:", err);
  } finally {
    await client.end();
  }
}

runDirectSeed();