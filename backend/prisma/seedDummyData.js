import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🚀 Starting Seeding Process...");

    try {
        // --- 1. WAREHOUSE HIERARCHY ---
        const godown = await prisma.godown.upsert({
            where: { name: 'Main Warehouse' },
            update: {},
            create: { name: 'Main Warehouse', isDefaultReceiving: true }
        });

        const zone = await prisma.zone.upsert({
            where: { name_godownId: { name: 'ZONE-A', godownId: godown.id } },
            update: {},
            create: { name: 'ZONE-A', godownId: godown.id }
        });

        const room = await prisma.room.upsert({
            where: { name_zoneId: { name: 'ROOM-101', zoneId: zone.id } },
            update: {},
            create: { name: 'ROOM-101', zoneId: zone.id }
        });

        const aisle = await prisma.aisle.upsert({
            where: { name_roomId: { name: 'AISLE-01', roomId: room.id } },
            update: {},
            create: { name: 'AISLE-01', roomId: room.id }
        });

        const rack = await prisma.rack.upsert({
            where: { name_aisleId: { name: 'RACK-R1', aisleId: aisle.id } },
            update: {},
            create: {
                name: 'RACK-R1',
                aisleId: aisle.id,
                maxWeightKg: 1000.00,
                maxVolumeCm3: 500000.00
            }
        });

        const shelf = await prisma.shelf.upsert({
            where: { name_rackId: { name: 'SHELF-S1', rackId: rack.id } },
            update: {},
            create: {
                name: 'SHELF-S1',
                rackId: rack.id,
                maxWeightKg: 500.00,
                maxVolumeCm3: 250000.00
            }
        });

        // ✅ FIXED: Using dynamic shelf.id and godown.id instead of hardcoded strings
        const bin = await prisma.bin.upsert({
            where: {
                name_shelfId: {
                    name: "Bin-01",
                    shelfId: shelf.id
                }
            },
            update: {
                godownId: godown.id
            },
            create: {
                name: "Bin-01",
                shelfId: shelf.id,
                godownId: godown.id,
                maxWeightKg: 100,
                maxVolumeCm3: 10000,
                storageClass: "GENERAL"
            }
        });

        // --- 2. PARTNERS, BRANDS & CATEGORIES ---
        const brand = await prisma.brand.upsert({
            where: { code: 'DEF-BRAND' },
            update: {},
            create: { code: 'DEF-BRAND', name: 'Default Brand' }
        });

        const category = await prisma.category.upsert({
            where: { code: 'DEF-CAT' },
            update: {},
            create: { code: 'DEF-CAT', name: 'Default Category' }
        });

        // --- 3. PRODUCT & VARIANTS ---
        const product = await prisma.product.upsert({
            where: { sku: 'SKU-SAMPLE-001' },
            update: {},
            create: {
                sku: 'SKU-SAMPLE-001',
                name: 'Sample Industrial Widget',
                brandId: brand.id,
                categoryId: category.id
            }
        });

        const variant = await prisma.productVariant.upsert({
            where: { sku: 'VAR-SAMPLE-001' },
            update: {},
            create: {
                sku: 'VAR-SAMPLE-001',
                productId: product.id,
                name: 'Blue Widget',
                price: 199.99,
                purchasePrice: 120.00,
                currentStock: 100,
                inventoryMode: 'BATCHED'
            }
        });

        // --- 4. UNIFIED BATCH TRACKING ---
        const batch = await prisma.batch.upsert({
            where: { batchNumber: 'BATCH-2026-TEST' },
            update: {},
            create: {
                batchNumber: 'BATCH-2026-TEST',
                productVariantId: variant.id,
                manufactureDate: new Date('2026-01-01'),
                expiryDate: new Date('2027-12-31'),
                status: 'ACTIVE'
            }
        });

        // --- 5. INVENTORY BALANCE ---
        await prisma.inventoryBalance.upsert({
            where: {
                productVariantId_binId_batchId: {
                    productVariantId: variant.id,
                    binId: bin.id,
                    batchId: batch.id
                }
            },
            update: {},
            create: {
                productVariantId: variant.id,
                binId: bin.id,
                batchId: batch.id,
                currentCount: 100,
                notes: 'Initial dummy stock allocation'
            }
        });

        console.log("🎉 Dummy data successfully created!");
    } catch (error) {
        console.error("❌ Seeding Error:", error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();