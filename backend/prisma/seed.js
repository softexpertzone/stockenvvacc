import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('CRITICAL: DATABASE_URL is missing in environment variables');
}

const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
});

async function main() {
    console.log('🌱 Starting seed...');

    // 1. Wipe Brand and ALL dependent tables
    console.log('🧹 Wiping existing Brands and their dependents...');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Brand" CASCADE;`);

    // 2. Seed Brands
    await prisma.brand.createMany({
        data: [
            {
                name: 'Logitech Enterprise',
                code: 'LOGI',
                description: 'Global peripheral parent entity',
            },
            {
                name: 'Samsung Semiconductor',
                code: 'SAMS',
                description: 'Global hardware component parent',
            },
        ],
    });

    // 3. Seed Module Settings
    console.log('📦 Seeding Module Settings...');

    const modules = [
        {
            key: 'module_inventory',
            value: 'true',
            description: 'Core Inventory module (always enabled)',
        },
        {
            key: 'module_accounts',
            value: 'false',
            description: 'Accounts & Finance module',
        },
        {
            key: 'module_hr',
            value: 'false',
            description: 'HR Management module',
        },
        {
            key: 'module_payroll',
            value: 'false',
            description: 'Payroll module',
        },
        {
            key: 'module_attendance',
            value: 'false',
            description: 'Attendance module',
        },
    ];

    for (const mod of modules) {
        await prisma.systemSetting.upsert({
            where: { key: mod.key },
            update: {},
            create: mod,
        });
    }

    console.log('✅ Module settings seeded successfully');
    console.log('✅ Success!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });