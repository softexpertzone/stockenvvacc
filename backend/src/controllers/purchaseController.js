// controllers/purchaseController.js
import prisma from '../lib/prisma.js';
import { createPurchaseReturnSchema } from '../validations/returnValidation.js';
import inventoryService from '../services/inventoryService.js';
import { findBestBin } from '../utils/putAwayEngine.js';
import stockService from '../services/stockService.js';
import { executeGRN } from '../services/grnService.js';
import { createPurchasePaymentAccountingEntries } from '../services/accounts/inventoryBridge.js';


/**
 * GET /api/purchase/orders
 */
export const getPurchaseOrders = async (req, res, next) => {
    try {
        const { status, partnerId, supplierId } = req.query;

        const whereClause = {};

        if (status) {
            whereClause.status = status.toUpperCase();
        }

        const finalPartnerId = partnerId || supplierId;
        if (finalPartnerId) {
            whereClause.partnerId = finalPartnerId;
        }

        const orders = await prisma.purchaseOrder.findMany({
            where: whereClause,
            include: {
                partner: {
                    select: { name: true, companyName: true }
                },
                items: {
                    include: {
                        productVariant: {
                            include: {
                                product: { select: { name: true } }
                            }
                        }
                    }
                },
                grns: {
                    include: {
                        items: {
                            include: {
                                bin: true,
                                productVariant: {
                                    include: {
                                        product: { select: { name: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // ========== Recalculate dueAmount using only existing fields ==========
        const ordersWithCorrectDue = await Promise.all(
            orders.map(async (po) => {
                // Only use referenceId + referenceType (these fields exist)
                const payments = await prisma.voucher.findMany({
                    where: {
                        referenceId: po.id,
                        referenceType: 'PURCHASE_ORDER',
                        voucherType: 'PAYMENT',
                        status: { notIn: ['CANCELLED', 'DRAFT'] }
                    },
                    include: {
                        entries: true
                    }
                });

                const totalPaidFromVouchers = payments.reduce((sum, v) => {
                    const debitTotal = (v.entries || [])
                        .filter(e => Number(e.debit) > 0)
                        .reduce((s, e) => s + Number(e.debit || 0), 0);
                    return sum + debitTotal;
                }, 0);

                const storedPaid = Number(po.paidAmount || 0);
                const correctPaidAmount = Math.max(storedPaid, totalPaidFromVouchers);

                const grandTotal = Number(po.grandTotal || po.totalAmount || 0);
                const correctDueAmount = Math.max(0, grandTotal - correctPaidAmount);

                let paymentStatus = 'UNPAID';
                if (correctDueAmount <= 0 && grandTotal > 0) {
                    paymentStatus = 'PAID';
                } else if (correctPaidAmount > 0) {
                    paymentStatus = 'PARTIALLY_PAID';
                }

                return {
                    ...po,
                    paidAmount: correctPaidAmount,
                    dueAmount: correctDueAmount,
                    paymentStatus,
                };
            })
        );

        res.status(200).json({ success: true, data: ordersWithCorrectDue || [] });
    } catch (error) {
        next(error);
    }
};

export default getPurchaseOrders;

/**
 * GET /api/purchase/orders/:id
 */
export const getPurchaseOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id || id === 'orders' || id === 'pending') {
            return res.status(400).json({ success: false, message: "Invalid ID parameter received." });
        }

        const purchaseOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                partner: true,
                items: {
                    include: {
                        productVariant: {
                            include: { product: { select: { name: true } } }
                        }
                    }
                },
                reevaluations: {
                    include: {
                        items: {
                            include: {
                                originalVariant: { include: { product: true } },
                                newVariant: { include: { product: true } },
                                bin: true,
                                batch: true
                            }
                        },
                        performedBy: { select: { name: true } }
                    }
                }
            }
        });

        if (!purchaseOrder) {
            return res.status(404).json({ success: false, message: "Purchase Order not found." });
        }

        res.json({ success: true, data: purchaseOrder });
    } catch (error) {
        console.error("Error fetching PO:", error);
        next(error);
    }
};

/**
 * POST /api/purchase/
 */
export const createPurchaseOrder = async (req, res, next) => {
    const { supplierId, partnerId, items } = req.body;
    const finalPartnerId = partnerId || supplierId;
    const generatedPurchaseNumber = req.body.purchaseNumber || `PO-${Date.now()}`;

    if (!finalPartnerId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            error: "Invalid request data. Partner ID and item list are required."
        });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // ---------- Find valid user ----------
            let validUser = null;
            if (req.user?.id) {
                validUser = await tx.user.findUnique({ where: { id: req.user.id } });
            }
            if (!validUser) {
                validUser = await tx.user.findFirst();
            }
            if (!validUser) {
                throw new Error("NO_USERS_FOUND");
            }

            // ---------- Calculate amounts ----------
            const calculatedSubtotal = items.reduce((sum, item) => {
                const qty = parseInt(item.qty || item.orderedQuantity || item.quantity, 10) || 0;
                const price = parseFloat(item.price || item.unitCost || item.unitPrice) || 0;
                return sum + (qty * price);
            }, 0);

            const subtotal = parseFloat(req.body.subtotal) || calculatedSubtotal;
            const taxAmount = parseFloat(req.body.taxAmount ?? req.body.vatAmount ?? req.body.tax ?? 0);
            const courierCost = parseFloat(req.body.courierCost ?? req.body.shippingCost ?? req.body.freight ?? 0);

            const grandTotal = parseFloat(
                req.body.grandTotal ?? req.body.totalAmount ?? (subtotal + taxAmount + courierCost)
            );

            const paidAmount = parseFloat(
                req.body.paidAmount ?? req.body.advanceAmount ?? req.body.advancePaid ?? req.body.receivedAmount ?? 0
            );

            const dueAmount = parseFloat(
                req.body.dueAmount ?? req.body.balanceDue ?? Math.max(0, grandTotal - paidAmount)
            );

            let paymentStatus = 'UNPAID';
            if (paidAmount >= grandTotal && grandTotal > 0) {
                paymentStatus = 'PAID';
            } else if (paidAmount > 0) {
                paymentStatus = 'PARTIALLY_PAID';
            }

            // ---------- Create Purchase Order ----------
            const po = await tx.purchaseOrder.create({
                data: {
                    purchaseNumber: generatedPurchaseNumber,
                    partner: { connect: { id: finalPartnerId } },
                    subtotal,
                    taxAmount,
                    courierCost,
                    grandTotal,
                    totalAmount: grandTotal,
                    paidAmount,
                    dueAmount,
                    paymentStatus,
                    status: req.body.status ? req.body.status.toUpperCase() : 'PENDING',
                    items: {
                        create: items.map(item => {
                            const qty = parseInt(item.qty || item.orderedQuantity || item.quantity, 10) || 0;
                            const unitCost = parseFloat(item.price || item.unitCost || item.unitPrice) || 0;
                            return {
                                productVariant: { connect: { id: item.productVariantId || item.variantId } },
                                quantityCount: qty,
                                unitCost,
                                totalPrice: qty * unitCost
                            };
                        })
                    },
                    createdBy: { connect: { id: validUser.id } }
                },
                include: {
                    partner: true,
                    items: {
                        include: { productVariant: true }
                    }
                }
            });

            // ---------- Audit Log ----------
            await tx.auditLog.create({
                data: {
                    entity: "PURCHASE_ORDER",
                    entityId: po.id,
                    action: "PO_CREATED",
                    operation: "CREATE",
                    userId: validUser.id,
                    meta: {
                        purchaseNumber: generatedPurchaseNumber,
                        grandTotal,
                        paidAmount,
                        dueAmount
                    }
                }
            });

            // =====================================================
            // ACCOUNTING BRIDGE – Record Advance / Partial Payment
            // =====================================================
            if (paidAmount > 0) {
                try {
                    await createPurchasePaymentAccountingEntries(tx, {
                        paymentAmount: paidAmount,
                        purchaseOrder: po,
                        paymentMethod: req.body.paymentMethod || 'CASH',
                        paymentReference: `Advance against ${generatedPurchaseNumber}`,
                        userId: validUser.id,
                        narration: `Advance payment against PO ${generatedPurchaseNumber}`
                    });
                    console.log(`[createPurchaseOrder] Payment voucher created for advance: ${paidAmount}`);
                } catch (accErr) {
                    // Do not fail the whole PO creation if accounting fails
                    console.error('[createPurchaseOrder] Failed to create payment accounting entry:', accErr.message);
                }
            }

            return po;
        });

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        if (error.message === "NO_USERS_FOUND") {
            return res.status(400).json({
                success: false,
                error: "Your database is missing a User!"
            });
        }
        next(error);
    }
};

/**
 * POST /api/purchase/process-grn
 * ============================================================
 * UPDATED: Now uses the modern executeGRN service
 * which automatically creates the double-entry accounting voucher
 * via inventoryBridge.js
 * ============================================================
 */
export const processGRN = async (req, res, next) => {
    const { purchaseOrderId, items, godownId } = req.body;
    const receivedBy = req.user?.id || req.body.receivedBy || null;

    try {
        // Basic validation
        if (!purchaseOrderId) {
            return res.status(400).json({
                success: false,
                message: 'purchaseOrderId is required'
            });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one item is required'
            });
        }

        // Resolve godown (fallback to default receiving godown)
        let targetGodownId = godownId;
        if (!targetGodownId) {
            const defaultGodown = await prisma.godown.findFirst({
                where: { isDefaultReceiving: true }
            });
            if (!defaultGodown) {
                throw new Error('No warehouse selected and no default receiving godown configured.');
            }
            targetGodownId = defaultGodown.id;
        }

        // Normalize items to the shape expected by executeGRN
        const normalizedItems = items.map(item => ({
            variantId: item.variantId || item.productVariantId || item.id,
            productVariantId: item.productVariantId || item.variantId || item.id,
            quantity: Number(item.quantity ?? item.qty ?? item.quantityCount ?? 0),
            quantityCount: Number(item.quantity ?? item.qty ?? item.quantityCount ?? 0),
            binId: item.binId || item.rackId || null,
            batchId: item.batchId || null,
            batchNumber: item.batchNumber || null,
        }));

        // =====================================================
        // CALL THE MODERN SERVICE (Inventory + Accounting Bridge)
        // =====================================================
        const result = await executeGRN({
            purchaseOrderId,
            items: normalizedItems,
            receivedBy,
            godownId: targetGodownId
        });

        // ---------- Enrich items for frontend ----------
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
                quantityCount: line.quantityCount || line.quantity || 0,
                batchId: line.batchId || null,
                batchNumber: line.batchNumber || '—',
                binId: line.binId || null,
                binName: binMap[line.binId] || '—',
            };
        });

        return res.status(200).json({
            success: true,
            message: 'GRN processed successfully. Inventory updated and accounting voucher created.',
            data: {
                id: result?.id || result?.grnId,
                grnId: result?.id || result?.grnId,
                grnNumber: result?.grnNumber,
                items: itemsForUi,          // ← frontend needs this
            },
            grn: result,
        });

    } catch (error) {
        console.error('[processGRN] Error:', error.message);

        if (error.message === 'NO_USERS_FOUND') {
            return res.status(400).json({
                success: false,
                error: 'Database Error: No users found.'
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to process GRN'
        });
    }
};

/**
 * POST /api/purchase/return
 */
export const processPurchaseReturn = async (req, res, next) => {
    try {
        const validatedData = createPurchaseReturnSchema.parse(req.body);

        let validUser = null;
        if (req.user?.id) validUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!validUser) validUser = await prisma.user.findFirst();
        if (!validUser) throw new Error('NO_USERS_FOUND');

        const returnDocument = await inventoryService.processPurchaseReturn(
            validatedData.purchaseOrderId,
            validatedData.items,
            validUser.id,
            validatedData.notes,
            validatedData.refundAmount
        );

        res.status(200).json({ success: true, data: returnDocument });
    } catch (error) {
        if (error.message === 'NO_USERS_FOUND') {
            return res.status(400).json({ success: false, error: 'Database Error: No users found.' });
        }
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }
        next(error);
    }
};

/**
 * POST /api/purchase/process-sorting
 */
export const processSortingReevaluation = async (req, res, next) => {
    const { purchaseOrderId, grnId, changes, notes, godownId } = req.body;

    if (!purchaseOrderId || !Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid request data. PO ID and changes are required.' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            let validUser = null;
            if (req.user?.id) validUser = await tx.user.findUnique({ where: { id: req.user.id } });
            if (!validUser) validUser = await tx.user.findFirst();
            if (!validUser) throw new Error('NO_USERS_FOUND');

            // Trace the correct godown from previous GRN
            let trueGodownId = null;

            const grnRecord = await tx.gRN.findFirst({
                where: { purchaseOrderId },
                include: { items: { include: { bin: true } } }
            });

            if (grnRecord && grnRecord.items.length > 0) {
                const receivedBin = grnRecord.items[0].bin;
                if (receivedBin) {
                    if (receivedBin.godownId) trueGodownId = receivedBin.godownId;
                    else if (receivedBin.warehouseId) trueGodownId = receivedBin.warehouseId;
                    else if (receivedBin.rackId) {
                        const r = await tx.rack.findUnique({ where: { id: receivedBin.rackId } });
                        if (r?.godownId) trueGodownId = r.godownId;
                        else if (r?.zoneId) {
                            const z = await tx.zone.findUnique({ where: { id: r.zoneId } });
                            if (z?.godownId) trueGodownId = z.godownId;
                        }
                    } else if (receivedBin.zoneId) {
                        const z = await tx.zone.findUnique({ where: { id: receivedBin.zoneId } });
                        if (z?.godownId) trueGodownId = z.godownId;
                    }
                }
            }

            if (!trueGodownId) trueGodownId = godownId;
            if (!trueGodownId || trueGodownId.trim() === '') {
                const defaultGodown = await tx.godown.findFirst({ where: { isDefaultReceiving: true } }) || await tx.godown.findFirst();
                if (!defaultGodown) throw new Error('NO_GODOWN|Could not determine the warehouse for this PO.');
                trueGodownId = defaultGodown.id;
            }

            for (let i = 0; i < changes.length; i++) {
                const change = changes[i];
                const qtyNeeded = parseInt(change.quantityConverted, 10);

                let originalBinId = change.originalBinId || change.binId;
                let originalBatchId = change.originalBatchId || change.batchId;

                const potentialStocks = await tx.inventoryBalance.findMany({
                    where: {
                        productVariantId: change.originalVariantId,
                        currentCount: { gte: qtyNeeded },
                        ...(originalBinId && originalBinId.trim() !== '' ? { binId: originalBinId } : {}),
                        ...(originalBatchId && originalBatchId.trim() !== '' ? { batchId: originalBatchId } : {})
                    }
                });

                let existingStock = null;

                for (const stock of potentialStocks) {
                    if (!stock.binId) continue;

                    let stockGodownId = null;
                    const b = await tx.bin.findUnique({ where: { id: stock.binId } });

                    if (b) {
                        if (b.godownId) stockGodownId = b.godownId;
                        else if (b.warehouseId) stockGodownId = b.warehouseId;
                        else if (b.rackId) {
                            const r = await tx.rack.findUnique({ where: { id: b.rackId } });
                            if (r?.godownId) stockGodownId = r.godownId;
                            else if (r?.zoneId) {
                                const z = await tx.zone.findUnique({ where: { id: r.zoneId } });
                                if (z?.godownId) stockGodownId = z.godownId;
                            }
                        } else if (b.zoneId) {
                            const z = await tx.zone.findUnique({ where: { id: b.zoneId } });
                            if (z?.godownId) stockGodownId = z.godownId;
                        }
                    }

                    if (stockGodownId === trueGodownId) {
                        existingStock = stock;
                        break;
                    }
                }

                if (!existingStock) {
                    throw new Error(`INSUFFICIENT_STOCK|Row ${i + 1}: Could not find enough mislabeled stock inside the correct Warehouse. Expected in Godown ID: ${trueGodownId}`);
                }

                change.originalBinId = existingStock.binId;
                change.originalBatchId = originalBatchId || existingStock.batchId;

                if (!change.newBinId || change.newBinId.trim() === '') {
                    const bin = await findBestBin(tx, {
                        variantId: change.newVariantId,
                        quantity: qtyNeeded,
                        godownId: trueGodownId
                    });
                    if (!bin) throw new Error(`INVALID_BIN|Row ${i + 1}: Could not determine a valid target bin automatically.`);
                    change.newBinId = bin.id;
                }

                if (!change.newBatchId || change.newBatchId.trim() === '') {
                    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                    const newBatch = await tx.batch.create({
                        data: {
                            batchNumber: `B-${Date.now().toString().slice(-6)}-${randomSuffix}`,
                            productVariantId: change.newVariantId,
                        }
                    });
                    change.newBatchId = newBatch.id;
                } else {
                    const batchExists = await tx.batch.findUnique({ where: { id: change.newBatchId } });
                    if (!batchExists) throw new Error(`INVALID_BATCH|Row ${i + 1}: Batch ID '${change.newBatchId}' does not exist.`);
                }
            }

            const reevaluationLog = await tx.stockReevaluation.create({
                data: {
                    purchaseOrderId,
                    grnId: grnId || null,
                    performedById: validUser.id,
                    notes: notes || 'Post-intake sorting adjustment',
                    items: {
                        create: changes.map(change => ({
                            originalVariantId: change.originalVariantId,
                            newVariantId: change.newVariantId,
                            binId: change.newBinId,
                            batchId: change.newBatchId,
                            quantityConverted: parseInt(change.quantityConverted, 10),
                            unitCost: parseFloat(change.unitCost) || 0
                        }))
                    }
                }
            });

            for (const change of changes) {
                const qty = parseInt(change.quantityConverted, 10);
                const weight = parseFloat(change.quantityKg || change.weightKg) || 0;
                const volume = parseFloat(change.volume) || 0;

                await stockService.executeStockMove(tx, {
                    sourceBinId: change.originalBinId,
                    destBinId: null,
                    productVariantId: change.originalVariantId,
                    batchId: change.originalBatchId,
                    quantity: qty,
                    weight,
                    volume,
                    type: 'ADJUSTMENT',
                    reference: `Re-eval ID: ${reevaluationLog.id}`,
                    notes: `Sorted out to Variant ${change.newVariantId}`
                });

                await tx.productVariant.update({
                    where: { id: change.originalVariantId },
                    data: { currentStock: { decrement: qty } }
                });

                await stockService.executeStockMove(tx, {
                    sourceBinId: null,
                    destBinId: change.newBinId,
                    productVariantId: change.newVariantId,
                    batchId: change.newBatchId,
                    quantity: qty,
                    weight,
                    volume,
                    type: 'ADJUSTMENT',
                    reference: `Re-eval ID: ${reevaluationLog.id}`,
                    notes: `Sorted in from Variant ${change.originalVariantId}`
                });

                await tx.productVariant.update({
                    where: { id: change.newVariantId },
                    data: { currentStock: { increment: qty } }
                });
            }

            return reevaluationLog;
        });

        res.status(201).json({ success: true, message: 'Sorting re-evaluation processed successfully.', data: result });
    } catch (error) {
        const errMsg = error?.message || '';

        if (errMsg.includes('NO_GODOWN')) {
            return res.status(400).json({ success: false, error: errMsg.split('|')[1] });
        }
        if (errMsg.includes('INSUFFICIENT_STOCK') || errMsg.includes('INVALID_QUANTITY')) {
            return res.status(400).json({ success: false, error: errMsg.split('|')[1] });
        }
        if (errMsg.includes('INVALID_BIN') || errMsg.includes('INVALID_BATCH')) {
            return res.status(400).json({ success: false, error: errMsg.split('|')[1] });
        }
        if (errMsg === 'NO_USERS_FOUND') {
            return res.status(400).json({ success: false, error: 'Database Error: No users found.' });
        }

        console.error('🔥 FATAL SORTING ERROR:', error);
        next(error);
    }
};