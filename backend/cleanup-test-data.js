import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PO_ID = '492c55f0-3842-454d-ab62-faa80fdc8eb3';
const GRN_ID = 'd7f0985a-63ac-4e77-9eac-e3305dc160ba';

async function main() {
    console.log('Starting cleanup...');

    try {
        // 1. Delete GRN Items
        const deletedItems = await prisma.gRNItem.deleteMany({
            where: { grnId: GRN_ID },
        });
        console.log(`✓ Deleted ${deletedItems.count} GRN items`);

        // 2. Delete StockReevaluation related to GRN
        const reevals = await prisma.stockReevaluation.findMany({
            where: { grnId: GRN_ID },
            select: { id: true },
        });

        if (reevals.length > 0) {
            await prisma.stockReevaluationItem.deleteMany({
                where: { reevaluationId: { in: reevals.map(r => r.id) } },
            });
            await prisma.stockReevaluation.deleteMany({
                where: { grnId: GRN_ID },
            });
            console.log('✓ Deleted related StockReevaluations (GRN)');
        }

        // 3. Delete the GRN
        await prisma.gRN.delete({ where: { id: GRN_ID } }).catch(() => {
            console.log('GRN already deleted or not found');
        });
        console.log('✓ GRN deleted');

        // 4. Delete Purchase Returns related to PO
        const returns = await prisma.purchaseReturn.findMany({
            where: { purchaseOrderId: PO_ID },
            select: { id: true },
        });

        if (returns.length > 0) {
            await prisma.purchaseReturnItem.deleteMany({
                where: { purchaseReturnId: { in: returns.map(r => r.id) } },
            });
            await prisma.purchaseReturn.deleteMany({
                where: { purchaseOrderId: PO_ID },
            });
            console.log('✓ Deleted related Purchase Returns');
        }

        // 5. Delete Transactions
        await prisma.transaction.deleteMany({
            where: { purchaseOrderId: PO_ID },
        });
        console.log('✓ Deleted related Transactions');

        // 6. Delete StockReevaluation related to PO
        const poReevals = await prisma.stockReevaluation.findMany({
            where: { purchaseOrderId: PO_ID },
            select: { id: true },
        });

        if (poReevals.length > 0) {
            await prisma.stockReevaluationItem.deleteMany({
                where: { reevaluationId: { in: poReevals.map(r => r.id) } },
            });
            await prisma.stockReevaluation.deleteMany({
                where: { purchaseOrderId: PO_ID },
            });
            console.log('✓ Deleted related StockReevaluations (PO)');
        }

        // 7. Delete Purchase Order Items
        const deletedPOItems = await prisma.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: PO_ID },
        });
        console.log(`✓ Deleted ${deletedPOItems.count} Purchase Order items`);

        // 8. Delete the Purchase Order
        await prisma.purchaseOrder.delete({ where: { id: PO_ID } }).catch(() => {
            console.log('Purchase Order already deleted or not found');
        });
        console.log('✓ Purchase Order deleted');

        console.log('\n✅ Cleanup finished successfully!');
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();