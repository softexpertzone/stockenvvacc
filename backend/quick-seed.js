const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting manual database injection...');

  // 1. Clean out existing test brands to prevent duplicates
  await prisma.brand.deleteMany({
    where: { id: { in: ['b1', 'b2', 'b3'] } }
  }).catch(() => {});

  // 2. Inject Master Brands
  await prisma.brand.createMany({
    data: [
      { id: 'b1', name: 'Logitech Enterprise', description: 'Global peripheral parent entity' },
      { id: 'b2', name: 'Samsung Semiconductor', description: 'Global hardware component parent' },
      { id: 'b3', name: 'Industrial Polymer Corp', description: 'Raw material production corporate' }
    ],
    skipDuplicates: true,
  });
  console.log('✅ Master brands successfully committed to PostgreSQL!');
}

main()
  .catch((e) => {
    console.error('❌ Ingestion failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


