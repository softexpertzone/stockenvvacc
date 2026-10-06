import 'dotenv/config';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('CRITICAL: DATABASE_URL is missing in environment variables');
}

// Industry-standard pooling
const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000
});

const adapter = new PrismaPg(pool);

// Initialize Prisma with the adapter
const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn']
});

// Export using ESM default export syntax
export default prisma;