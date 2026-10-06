import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// 1. Safely extract Pool from the pg default export to prevent ESM named export crashes
const { Pool } = pg;

// 2. Configure the connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 3. Initialize the adapter
const adapter = new PrismaPg(pool);

// 4. Initialize the Prisma Client with the adapter
const prisma = new PrismaClient({ adapter });

// 5. Export using ESM syntax
export default prisma;