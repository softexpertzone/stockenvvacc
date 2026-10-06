import prisma from '../lib/prisma.js';
import { findBestBin } from '../utils/putAwayEngine.js';
import { createGRNAccountingEntries } from './accounts/inventoryBridge.js';

export const executeGRN = async ({ purchaseOrderId, items, receivedBy, godownId }) => {
    return await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: { items: true }
        });

        if (!po) throw new Error("Purchase Order not found.");
        if (po.status === 'RECEIVED') throw new Error("Purchase Order is already fully received.");

        const targetGodown = godownId || po.targetGodownId;
        if (!targetGodown) throw new Error("No target warehouse (godown) specified.");

        const variantIds = items.map(i => i.variantId || i.productVariantId);
        const variantsInfo = await tx.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
                id: true,
                weightKg: true,
                volumeCm3: true,
                sku: true,
                purchasePrice: true,   // ← changed
                price: true            // ← also keep this as fallback
            }
        });
        const variantMap = new Map(variantsInfo.map(v => [v.id, v]));

        const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;
        const grn = await tx.gRN.create({
            data: { grnNumber, purchaseOrderId, receivedBy, status: 'RECEIVED' }
        });

        let totalValue = 0; // for accounting

        for (const item of items) {
            const targetVariantId = item.variantId || item.productVariantId;
            const qtyCount = parseInt(item.quantity || item.quantityCount || item.qty, 10);
            const variantMeta = variantMap.get(targetVariantId);
            if (!variantMeta) throw new Error(`Variant not found: ${targetVariantId}`);

            const computedKg = qtyCount * Number(variantMeta.weightKg || 0);
            const computedCm3 = qtyCount * Number(variantMeta.volumeCm3 || 0);

            // Calculate value for this line (prefer PO item price, fallback to costPrice)
            const poItem = po.items.find(pi =>
                (pi.variantId || pi.productVariantId) === targetVariantId
            );
            const unitCost = Number(
                poItem?.unitPrice ||
                poItem?.unitCost ||
                variantMeta.purchasePrice ||
                variantMeta.price ||
                0
            );
            totalValue += unitCost * qtyCount;

            let finalBinId = item.binId;

            if (!finalBinId) {
                const bestBin = await findBestBin(tx, {
                    variantId: targetVariantId,
                    quantity: qtyCount,
                    godownId: targetGodown
                });
                if (!bestBin) throw new Error(`No suitable bin found for ${variantMeta.sku} in godown ${targetGodown}`);
                finalBinId = bestBin.id;
            }

            // Validate selected bin
            const manualBin = await tx.bin.findUnique({ where: { id: finalBinId } });
            if (!manualBin) throw new Error(`Bin ${finalBinId} not found.`);

            // Create batch
            const batch = await tx.batch.create({
                data: {
                    batchNumber: `BTH-${Date.now()}-${variantMeta.sku}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
                    productVariantId: targetVariantId,
                    status: 'ACTIVE'
                }
            });

            // Inventory balance
            await tx.inventoryBalance.upsert({
                where: {
                    productVariantId_binId_batchId: {
                        productVariantId: targetVariantId,
                        binId: finalBinId,
                        batchId: batch.id
                    }
                },
                create: {
                    productVariantId: targetVariantId,
                    binId: finalBinId,
                    batchId: batch.id,
                    currentCount: qtyCount,
                    currentKg: computedKg
                },
                update: {
                    currentCount: { increment: qtyCount },
                    currentKg: { increment: computedKg }
                }
            });

            // Ledger
            await tx.stockLedger.create({
                data: {
                    productVariantId: targetVariantId,
                    destinationBinId: finalBinId,
                    quantityCount: qtyCount,
                    quantityKg: computedKg,
                    type: 'GRN',
                    reference: grnNumber,
                    notes: `GRN ${grnNumber} → Bin ${finalBinId}`
                }
            });
        }

        // Update PO status
        await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: 'RECEIVED' }
        });

        // =====================================================
        // ACCOUNTING BRIDGE (only if Accounts module is ON)
        // =====================================================
        try {
            const accountingResult = await createGRNAccountingEntries(tx, {
                grn,
                purchaseOrder: po,
                items,
                totalValue,
                userId: receivedBy
            });

            if (accountingResult) {
                console.log(`[executeGRN] Accounting voucher created: ${accountingResult.voucherNumber}`);
            } else {
                console.warn('[executeGRN] No accounting voucher created (module off or missing ledgers)');
            }
        } catch (accError) {
            // Inventory movement still succeeds – we only log the accounting failure
            console.error('[executeGRN] Accounting bridge failed:', accError.message);
            console.error(accError.stack);
        }

        return grn;
    });
};