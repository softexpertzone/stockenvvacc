// controllers/grnController.js
import { executeGRN } from '../services/grnService.js';
import putAwayEngine from '../utils/putAwayEngine.js';
import prisma from '../lib/prisma.js';

// ====================== GET GRNs (for dropdown) ======================
export const getGRNs = async (req, res, next) => {
    try {
        const { partnerId } = req.query;

        const where = {};

        if (partnerId) {
            where.purchaseOrder = {
                partnerId: partnerId,
            };
        }

        const grns = await prisma.gRN.findMany({
            where,
            orderBy: { receivedAt: 'desc' },
            take: 50,
            select: {
                id: true,
                grnNumber: true,
                receivedAt: true,
                purchaseOrderId: true,
                purchaseOrder: {
                    select: {
                        purchaseNumber: true,
                        partnerId: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            data: grns,
        });
    } catch (error) {
        next(error);
    }
};

// ====================== PROCESS GRN ======================
export const processGRN = async (req, res) => {
    const { purchaseOrderId, items, godownId } = req.body;
    const receivedBy = req.user?.id || req.body.receivedBy || null;

    if (!purchaseOrderId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payload. Missing PO ID or items.',
        });
    }
    if (!godownId) {
        return res.status(400).json({
            success: false,
            message: 'Warehouse (Godown) selection is required for automatic placement.',
        });
    }

    try {
        // Normalize items
        const normalizedItems = items.map(item => ({
            variantId: item.productVariantId || item.variantId || item.id,
            productVariantId: item.productVariantId || item.variantId || item.id,
            quantity: Number(item.quantity ?? item.quantityCount ?? item.qty ?? 1),
            quantityCount: Number(item.quantity ?? item.quantityCount ?? item.qty ?? 1),
            binId: item.binId || null,
            batchId: item.batchId || null,
            batchNumber: item.batchNumber || null,
        }));

        // Call the modern service (Inventory + Accounting Bridge)
        const result = await executeGRN({
            purchaseOrderId,
            items: normalizedItems,
            receivedBy,
            godownId,
        });

        // Enrich response for frontend
        const binIds = [...new Set(normalizedItems.map(i => i.binId).filter(Boolean))];
        const bins = binIds.length
            ? await prisma.bin.findMany({
                where: { id: { in: binIds } },
                select: { id: true, name: true },
            })
            : [];
        const binMap = Object.fromEntries(bins.map(b => [b.id, b.name]));

        const variantIds = [...new Set(normalizedItems.map(i => i.productVariantId).filter(Boolean))];
        const variants = variantIds.length
            ? await prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: {
                    id: true,
                    sku: true,
                    product: { select: { name: true } },
                },
            })
            : [];
        const variantMap = Object.fromEntries(
            variants.map(v => [
                v.id,
                { sku: v.sku, productName: v.product?.name || 'Unknown' },
            ])
        );

        const itemsForUi = normalizedItems.map(line => {
            const v = variantMap[line.productVariantId] || {};
            return {
                productVariantId: line.productVariantId,
                productName: v.productName || 'Unknown',
                sku: v.sku || '',
                quantityCount: line.quantityCount,
                batchId: line.batchId,
                batchNumber: line.batchNumber || '—',
                binId: line.binId,
                binName: binMap[line.binId] || '—',
            };
        });

        return res.status(200).json({
            success: true,
            message: 'GRN processed successfully. Inventory updated and accounting voucher created.',
            data: {
                grnId: result?.id,
                grnNumber: result?.grnNumber,
                items: itemsForUi,
            },
            grn: result,
        });
    } catch (error) {
        console.error('GRN Processing System Error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to execute GRN transaction.',
        });
    }
};