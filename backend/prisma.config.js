/**
 * prisma.config.js
 * Configures the database adapter and environment for Prisma 7
 */

// 1. Force load .env from the root directory
const path = require('path');
require('dotenv').config();

const { defineConfig } = require('prisma/config');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// 2. Validate environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ CRITICAL: DATABASE_URL is missing in .env file.");
    process.exit(1);
}

// 3. Initialize Adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 4. Export configuration
module.exports = defineConfig({
    schema: "prisma/schema.prisma",

    // Explicitly define the database connection URL for the CLI
    datasource: {
        url: connectionString,
    },

    // Pass the adapter for runtime queries
    client: {
        adapter: adapter,
    },

    // Migration and seed settings
    migrations: {
        path: "prisma/migrations",
        seed: "node prisma/seed_admin.js",
    },
});