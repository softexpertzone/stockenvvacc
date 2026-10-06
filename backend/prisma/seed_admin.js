import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// Establish the adapter connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn']
});

async function main() {
    console.log('🌱 Starting Full System Seed...');

    try {
        // 1. Seed Admin User
        const hashedPassword = await bcrypt.hash('Admin@2026!Secure', 10);
        const admin = await prisma.user.upsert({
            where: { email: 'admin@softexpertzone.com' },
            update: {},
            create: {
                email: 'admin@softexpertzone.com',
                name: 'Kazi Ahmad Moin Uddin',
                password: hashedPassword,
                role: 'ADMIN',
                permission: {
                    create: {
                        canViewInventory: true,
                        canManageProducts: true,
                        canManageSuppliers: true,
                        canProcessPayments: true,
                        canHandleReturns: true,
                        canTransferStock: true,
                        canManageSales: true
                    }
                }
            }
        });
        console.log('✅ Admin User Created:', admin.email);

        // 2. Seed Master Categories
        const categories = [
            { name: 'Hardware', code: 'HARD' },
            { name: 'Software', code: 'SOFT' },
            { name: 'Peripherals', code: 'PERI' }
        ];

        for (const cat of categories) {
            await prisma.category.upsert({
                where: { code: cat.code },
                update: { name: cat.name },
                create: cat
            });
        }
        console.log('✅ Categories Seeded.');

        // 3. Seed Master Brands
        const brands = [
            { name: 'Logitech Enterprise', code: 'LOGI' },
            { name: 'Samsung Semiconductor', code: 'SAMS' }
        ];

        for (const brand of brands) {
            await prisma.brand.upsert({
                where: { code: brand.code },
                update: { name: brand.name },
                create: brand
            });
        }
        console.log('✅ Brands Seeded.');

        console.log('🚀 Seeding Completed Successfully!');
    } catch (error) {
        console.error('❌ SEED ERROR:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();