// services/purchaseService.js
import prisma from '../lib/prisma.js';
import { executeGRN } from './grnService.js';

/**
 * Modern receive Purchase Order → redirects to the full GRN flow
 * that also creates the accounting entries (InventoryBridge)
 */
export const receivePurchaseOrder = async ({
                                               purchaseOrderId,
                                               items,
                                               receivedBy,
                                               godownId
                                           }) => {
    if (!purchaseOrderId) {
        throw new Error('purchaseOrderId is required');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('At least one item is required to receive');
    }

    // Delegate everything to the modern GRN service
    // (this already handles inventory + accounting bridge)
    return executeGRN({
        purchaseOrderId,
        items,
        receivedBy,
        godownId
    });
};

/**
 * Optional helper – keep if other places still call the old signature
 * (purchaseOrderId, rackId)
 */
export const receivePurchaseOrderLegacy = async (purchaseOrderId, rackId) => {
    const po = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { items: true }
    });

    if (!po) throw new Error('Purchase Order not found');
    if (po.status === 'RECEIVED') throw new Error('Purchase Order already received');

    // Convert old format → new format expected by executeGRN
    const items = po.items.map(item => ({
        variantId: item.variantId || item.productVariantId,
        quantity: item.quantityCount || item.quantity || item.qty,
        binId: null          // let put-away engine decide
    }));

    return executeGRN({
        purchaseOrderId,
        items,
        receivedBy: null,   // or pass current user if available
        godownId: rackId    // treating old rackId as godownId
    });
};

// Keep default export for any old require() usage
export default {
    receivePurchaseOrder,
    receivePurchaseOrderLegacy
};