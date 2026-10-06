import { Worker } from 'bullmq';
import prisma from '../lib/prisma.js'; // Ensure this points to your prisma client

const worker = new Worker('inventoryAllocationQueue', async (job) => {
    if (job.name === 'cleanup') {
        const { transferId } = job.data;

        const transfer = await prisma.internalTransfer.findUnique({
            where: { id: transferId },
            include: { items: true }
        });

        if (transfer) {
            for (const item of transfer.items) {
                await prisma.inventoryBalance.update({
                    where: { productVariantId_binId_batchId: {
                            productVariantId: item.productVariantId, binId: item.sourceBinId, batchId: item.batchId
                        }},
                    data: { allocatedCount: { decrement: item.quantityCount } }
                });
            }
            console.log(`[Worker] Cleaned up abandoned transfer: ${transfer.transferRef}`);
        }
    }
}, { connection: { host: '127.0.0.1', port: 6379 } });