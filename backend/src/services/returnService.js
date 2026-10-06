import prisma from '../lib/prisma.js';
import { AppError } from '../utils/responseHandler.js';

class ReturnService {
    // ====================== PURCHASE RETURN ======================
    async createPurchaseReturn(data, userId) {
        const { items, ...header } = data;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new AppError('At least one return item is required', 400);
        }

        return await prisma.$transaction(async (tx) => {
            const count = await tx.purchaseReturn.count();
            const returnNumber = `PR-${String(count + 1).padStart(6, '0')}`;

            const resolveReasonId = async (reasonValue) => {
                if (!reasonValue) {
                    throw new AppError('reasonId is required', 400);
                }

                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reasonValue);
                if (isUuid) return reasonValue;

                const reason = await tx.returnReasonMaster.findFirst({
                    where: {
                        code: { equals: reasonValue, mode: 'insensitive' },
                        isActive: true,
                    },
                });

                if (!reason) {
                    throw new AppError(`Return reason "${reasonValue}" not found`, 400);
                }
                return reason.id;
            };

            const purchaseReturn = await tx.purchaseReturn.create({
                data: {
                    returnNumber,
                    ...header,
                    ...(userId && userId !== '00000000-0000-0000-0000-000000000000' && {
                        processedById: userId,
                    }),
                    status: 'DRAFT',
                    items: {
                        create: await Promise.all(
                            items.map(async (item) => {
                                if (!item.productVariantId) {
                                    throw new AppError('productVariantId is required', 400);
                                }

// ---------- STRONG VALIDATION: Product must exist in the selected Bin ----------
                                if (!item.binId) {
                                    throw new AppError(`Line item missing Bin. Please select a storage location.`, 400);
                                }

                                const stockCheck = await tx.inventoryBalance.findFirst({
                                    where: {
                                        productVariantId: item.productVariantId,
                                        binId: item.binId,
                                        ...(item.batchId ? { batchId: item.batchId } : {}),
                                        currentCount: { gt: 0 },
                                    },
                                    include: {
                                        bin: {
                                            select: {
                                                id: true,
                                                name: true,
                                                godown: { select: { id: true, name: true } }
                                            }
                                        }
                                    }
                                });

                                if (!stockCheck) {
                                    throw new AppError(
                                        `This product is NOT available in the selected Bin/Godown. ` +
                                        `Please select the correct location where the product was received (from the GRN).`,
                                        400
                                    );
                                }

                                const reasonId = await resolveReasonId(item.reasonId);
                                return {
                                    quantityCount: item.quantityCount,
                                    quantityKg: item.quantityKg || 0,
                                    conditionGrade: item.conditionGrade || null,
                                    disposition,
                                    notes: item.notes || null,
                                    productVariant: { connect: { id: item.productVariantId } },
                                    bin: { connect: { id: item.binId } },
                                    reason: { connect: { id: reasonId } },
                                    ...(item.batchId && { batch: { connect: { id: item.batchId } } }),
                                    ...(item.originalSalesOrderItemId && {
                                        originalSalesOrderItem: { connect: { id: item.originalSalesOrderItemId } },
                                    }),
                                };
                            })
                        ),
                    },
                },
                include: {
                    items: {
                        include: {
                            productVariant: true,
                            bin: true,
                            batch: true,
                            reason: true,
                        },
                    },
                    partner: true,
                },
            });

            return purchaseReturn;
        });
    }

    async confirmPurchaseReturn(id, userId) {
        return await prisma.$transaction(async (tx) => {
            const purchaseReturn = await tx.purchaseReturn.findUnique({
                where: { id },
                include: { items: true },
            });

            if (!purchaseReturn) throw new AppError('Purchase Return not found', 404);
            if (purchaseReturn.status !== 'DRAFT') {
                throw new AppError('Only DRAFT returns can be confirmed', 400);
            }

            for (const item of purchaseReturn.items) {
                if (!item.productVariantId) {
                    throw new AppError('productVariantId is required on return item', 400);
                }

                let batchId = item.batchId;
                let binId = item.binId;

                // ---------- 1. Resolve Batch if missing ----------
                if (!batchId) {
                    const balances = await tx.inventoryBalance.findMany({
                        where: {
                            productVariantId: item.productVariantId,
                            currentCount: { gt: 0 },
                            ...(binId && { binId }),
                        },
                        orderBy: { createdAt: 'desc' },
                    });

                    if (balances.length === 0) {
                        throw new AppError(
                            `No stock found for variant ${item.productVariantId}. Cannot confirm return.`,
                            400
                        );
                    }

                    const uniqueBatches = [
                        ...new Set(balances.map((b) => b.batchId).filter(Boolean)),
                    ];

                    if (uniqueBatches.length === 0) {
                        throw new AppError(
                            `No batch found for variant ${item.productVariantId}. Please edit the return and select a Batch.`,
                            400
                        );
                    }

                    if (uniqueBatches.length > 1 && !binId) {
                        throw new AppError(
                            `Multiple batches exist for this product. Please edit the return and select the correct Batch (and Bin) before confirming.`,
                            400
                        );
                    }

                    batchId = uniqueBatches[0];

                    // save the resolved batch back to the item
                    await tx.purchaseReturnItem.update({
                        where: { id: item.id },
                        data: { batchId },
                    });
                }

                // ---------- 2. Resolve Bin if missing ----------
                if (!binId) {
                    const balances = await tx.inventoryBalance.findMany({
                        where: {
                            productVariantId: item.productVariantId,
                            batchId: batchId,
                            currentCount: { gt: 0 },
                        },
                    });

                    if (balances.length === 0) {
                        throw new AppError(
                            `No stock found for this product + batch. Cannot confirm return.`,
                            400
                        );
                    }

                    if (balances.length > 1) {
                        throw new AppError(
                            `Multiple bins contain this batch. Please edit the return and select the correct Bin before confirming.`,
                            400
                        );
                    }

                    binId = balances[0].binId;

                    await tx.purchaseReturnItem.update({
                        where: { id: item.id },
                        data: { binId },
                    });
                }

                // ---------- 3. Final stock check ----------
                const balance = await tx.inventoryBalance.findUnique({
                    where: {
                        productVariantId_binId_batchId: {
                            productVariantId: item.productVariantId,
                            binId: binId,
                            batchId: batchId,
                        },
                    },
                });

                if (!balance || balance.currentCount < item.quantityCount) {
                    throw new AppError(
                        `Insufficient stock for variant ${item.productVariantId} in bin ${binId}`,
                        400
                    );
                }

                // ---------- 4. Deduct stock ----------
                await tx.inventoryBalance.update({
                    where: { id: balance.id },
                    data: {
                        currentCount: { decrement: item.quantityCount },
                        currentKg: { decrement: item.quantityKg || 0 },
                        returnedCount: { increment: item.quantityCount },
                    },
                });

                // ---------- 5. Create ledger + movement ----------
                await tx.stockLedger.create({
                    data: {
                        productVariantId: item.productVariantId,
                        sourceBinId: binId,
                        quantityCount: -item.quantityCount,
                        quantityKg: -(item.quantityKg || 0),
                        type: 'PURCHASE_RETURN',
                        reference: purchaseReturn.returnNumber,
                        notes: `Purchase Return confirmed [${purchaseReturn.id}]`,
                    },
                });

                await tx.stockMovement.create({
                    data: {
                        type: 'PURCHASE_RETURN',
                        referenceId: purchaseReturn.id,
                        quantity: -item.quantityCount,
                        productVariantId: item.productVariantId,
                        binId: binId,
                        batchId: batchId,
                    },
                });
            }

            // ---------- Update header status ----------
            const updateData = { status: 'CONFIRMED' };
            if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
                updateData.processedById = userId;
            }

            return await tx.purchaseReturn.update({
                where: { id },
                data: updateData,
                include: { items: true, partner: true },
            });
        });
    }

    // ====================== CUSTOMER RETURN ======================


    async createCustomerReturn(data, userId) {
        const { items, ...header } = data;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new AppError('At least one return item is required', 400);
        }

        return await prisma.$transaction(async (tx) => {
            const count = await tx.customerReturn.count();
            const returnNumber = `CR-${String(count + 1).padStart(6, '0')}`;

            const resolveReasonId = async (reasonValue) => {
                if (!reasonValue) throw new AppError('reasonId is required', 400);

                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reasonValue);
                if (isUuid) return reasonValue;

                const reason = await tx.returnReasonMaster.findFirst({
                    where: {
                        code: { equals: reasonValue, mode: 'insensitive' },
                        isActive: true,
                        OR: [{ type: 'SALES' }, { type: 'BOTH' }],
                    },
                });
                if (!reason) {
                    throw new AppError(`Return reason "${reasonValue}" not found or not valid for Sales Return`, 400);
                }
                return reason.id;
            };

            // Pre-validate every line (same strictness as purchase return)
            const preparedItems = await Promise.all(
                items.map(async (item, idx) => {
                    if (!item.productVariantId) {
                        throw new AppError(`Line ${idx + 1}: productVariantId is required`, 400);
                    }
                    if (!item.quantityCount || item.quantityCount <= 0) {
                        throw new AppError(`Line ${idx + 1}: quantityCount must be > 0`, 400);
                    }

                    const reasonId = await resolveReasonId(item.reasonId);

                    // Force disposition decision at create time (can be overridden later)
                    let disposition = (item.disposition || '').toUpperCase();
                    if (!disposition) {
                        // sensible default from reason + condition
                        disposition = this.inferDisposition({
                            reason: { code: item.reasonCode || item.reasonId },
                            conditionGrade: item.conditionGrade,
                        });
                    }

                    // Validate disposition is one of the allowed values
                    const allowed = ['RETURN_TO_STOCK', 'RESTOCK', 'QUARANTINE', 'SCRAP', 'REPAIR'];
                    if (!allowed.includes(disposition)) {
                        throw new AppError(
                            `Line ${idx + 1}: invalid disposition "${disposition}". Allowed: ${allowed.join(', ')}`,
                            400
                        );
                    }

                    // Notes mandatory for non-restock
                    if (['QUARANTINE', 'SCRAP', 'REPAIR'].includes(disposition) && !item.notes?.trim()) {
                        throw new AppError(
                            `Line ${idx + 1}: notes are required when disposition is ${disposition}`,
                            400
                        );
                    }

                    // binId is the *source* location the customer is returning from
                    // (or the original sales bin). Target bin is decided at receive time.
                    if (!item.binId) {
                        throw new AppError(`Line ${idx + 1}: binId (original / receiving location) is required`, 400);
                    }

                    return {
                        quantityCount: item.quantityCount,
                        quantityKg: item.quantityKg || 0,
                        conditionGrade: item.conditionGrade || null,
                        disposition,
                        notes: item.notes || null,
                        productVariant: { connect: { id: item.productVariantId } },
                        bin: { connect: { id: item.binId } },
                        reason: { connect: { id: reasonId } },
                        ...(item.batchId && { batch: { connect: { id: item.batchId } } }),
                        ...(item.originalSalesOrderItemId && {
                            originalSalesOrderItem: { connect: { id: item.originalSalesOrderItemId } },
                        }),
                    };
                })
            );

            const customerReturn = await tx.customerReturn.create({
                data: {
                    returnNumber,
                    ...header,
                    ...(userId && userId !== '00000000-0000-0000-0000-000000000000' && {
                        processedById: userId,
                    }),
                    status: 'DRAFT',
                    items: { create: preparedItems },
                },
                include: {
                    items: {
                        include: {
                            productVariant: true,
                            bin: true,
                            batch: true,
                            reason: true,
                        },
                    },
                    partner: true,
                },
            });

            return customerReturn;
        });
    }

    async receiveCustomerReturn(id, userId) {
        return await prisma.$transaction(async (tx) => {
            const customerReturn = await tx.customerReturn.findUnique({
                where: { id },
                include: {
                    items: {
                        include: {
                            reason: true,
                            productVariant: true,
                            bin: true,
                            batch: true,
                        },
                    },
                },
            });

            if (!customerReturn) throw new AppError('Customer Return not found', 404);
            if (!['DRAFT', 'APPROVED'].includes(customerReturn.status)) {
                throw new AppError('Only DRAFT or APPROVED returns can be received', 400);
            }

            for (const item of customerReturn.items) {
                // ---------- 1. Resolve / create batch ----------
                let batchId = item.batchId;
                if (!batchId) {
                    const existing = await tx.inventoryBalance.findFirst({
                        where: {
                            productVariantId: item.productVariantId,
                            ...(item.binId && { binId: item.binId }),
                        },
                        orderBy: { createdAt: 'desc' },
                    });
                    if (existing?.batchId) {
                        batchId = existing.batchId;
                    } else {
                        const newBatch = await tx.batch.create({
                            data: {
                                batchNumber: `AUTO-CR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                productVariantId: item.productVariantId,
                                status: 'ACTIVE',
                            },
                        });
                        batchId = newBatch.id;
                    }
                    await tx.customerReturnItem.update({
                        where: { id: item.id },
                        data: { batchId },
                    });
                }

                // ---------- 2. Final disposition decision ----------
                const disposition = (item.disposition || this.inferDisposition(item)).toUpperCase();
                let targetBinId = item.targetBinId || null;
                let qualityAction = 'NORMAL';

                if (disposition === 'RETURN_TO_STOCK' || disposition === 'RESTOCK') {
                    qualityAction = 'NORMAL';
                    // Prefer the original bin if it is still a valid saleable location
                    targetBinId = targetBinId || item.binId;
                    // Optional safety: never restock into a quarantine-named bin
                    if (await this.isQuarantineBin(tx, targetBinId)) {
                        // find any non-quarantine bin in the same godown, or throw
                        const safeBin = await this.findSafeSaleableBin(tx, item.binId, item.productVariantId);
                        if (!safeBin) {
                            throw new AppError(
                                `Cannot restock: original bin is quarantine and no alternative saleable bin found for variant ${item.productVariantId}`,
                                400
                            );
                        }
                        targetBinId = safeBin;
                    }
                } else if (disposition === 'QUARANTINE' || disposition === 'REPAIR') {
                    qualityAction = 'QUARANTINE';
                    const isAlreadyQ = targetBinId ? await this.isQuarantineBin(tx, targetBinId) : false;
                    if (!isAlreadyQ) {
                        targetBinId = await this.getDefaultQuarantineBin(tx, item);
                    }
                } else if (disposition === 'SCRAP') {
                    qualityAction = 'SCRAP';
                    targetBinId = null; // no stock increase
                } else {
                    throw new AppError(`Unknown disposition: ${disposition}`, 400);
                }

                if (qualityAction !== 'SCRAP' && !targetBinId) {
                    throw new AppError(
                        `Cannot determine target bin for variant ${item.productVariantId} (disposition=${disposition})`,
                        400
                    );
                }

                // ---------- 3. Stock impact ----------
                if (qualityAction !== 'SCRAP') {
                    await tx.inventoryBalance.upsert({
                        where: {
                            productVariantId_binId_batchId: {
                                productVariantId: item.productVariantId,
                                binId: targetBinId,
                                batchId: batchId,
                            },
                        },
                        update: {
                            currentCount: { increment: item.quantityCount },
                            currentKg: { increment: item.quantityKg || 0 },
                            returnedCount: { increment: item.quantityCount },
                            lastStockMovement: new Date(),
                        },
                        create: {
                            productVariantId: item.productVariantId,
                            binId: targetBinId,
                            batchId: batchId,
                            currentCount: item.quantityCount,
                            currentKg: item.quantityKg || 0,
                            returnedCount: item.quantityCount,
                        },
                    });

                    // Keep productVariant.currentStock in sync (same as purchase / GRN)
                    await tx.productVariant.update({
                        where: { id: item.productVariantId },
                        data: { currentStock: { increment: item.quantityCount } },
                    });
                }

                // ---------- 4. Immutable audit trail ----------
                await tx.stockLedger.create({
                    data: {
                        productVariantId: item.productVariantId,
                        destinationBinId: qualityAction === 'SCRAP' ? null : targetBinId,
                        sourceBinId: item.binId || null,
                        quantityCount: qualityAction === 'SCRAP' ? 0 : item.quantityCount,
                        quantityKg: qualityAction === 'SCRAP' ? 0 : (item.quantityKg || 0),
                        type: 'CUSTOMER_RETURN',
                        reference: customerReturn.returnNumber,
                        notes: [
                            `Disposition: ${disposition}`,
                            `Condition: ${item.conditionGrade || 'N/A'}`,
                            item.notes || '',
                        ].filter(Boolean).join(' | '),
                    },
                });

                await tx.stockMovement.create({
                    data: {
                        type: 'CUSTOMER_RETURN',
                        referenceId: customerReturn.id,
                        quantity: qualityAction === 'SCRAP' ? 0 : item.quantityCount,
                        productVariantId: item.productVariantId,
                        binId: qualityAction === 'SCRAP' ? null : targetBinId,
                        batchId: batchId,
                    },
                });

                // ---------- 5. Persist final target + disposition on the line ----------
                await tx.customerReturnItem.update({
                    where: { id: item.id },
                    data: {
                        disposition,
                        targetBinId: targetBinId,
                        // optionally store a final qualityAction if you add the column
                    },
                });
            }

            // ---------- Header status ----------
            const updateData = { status: 'RECEIVED' };
            if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
                updateData.processedById = userId;
            }

            return await tx.customerReturn.update({
                where: { id },
                data: updateData,
                include: {
                    items: {
                        include: {
                            productVariant: true,
                            bin: true,
                            batch: true,
                            reason: true,
                        },
                    },
                    partner: true,
                },
            });
        });
    }

    // ====================== HELPERS ======================
    inferDisposition(item) {
        const reasonCode = (item.reason?.code || item.reasonCode || '').toUpperCase();
        const condition = (item.conditionGrade || '').toUpperCase();

        // Explicit condition wins
        if (['DAMAGED', 'DEFECTIVE', 'BROKEN', 'EXPIRED', 'FAULTY'].includes(condition)) {
            return 'QUARANTINE';
        }
        if (['GOOD', 'OPEN_BOX', 'LIKE_NEW', 'NEW'].includes(condition)) {
            return 'RETURN_TO_STOCK';
        }

        // Fall back to reason code
        if (['DAMAGED', 'DEFECTIVE', 'EXPIRED', 'BROKEN', 'QUALITY', 'FAULTY'].includes(reasonCode)) {
            return 'QUARANTINE';
        }
        if (['WRONG_SIZE', 'WRONG_ITEM', 'CUSTOMER_CHANGE', 'NOT_AS_DESCRIBED'].includes(reasonCode)) {
            return 'RETURN_TO_STOCK';
        }

        // Safe default – never auto-restock unknown
        return 'QUARANTINE';
    }

    async isQuarantineBin(tx, binId) {
        if (!binId) return false;
        const bin = await tx.bin.findUnique({
            where: { id: binId },
            select: { id: true, name: true },
        });
        if (!bin) return false;
        const name = (bin.name || '').toLowerCase();
        return (
            name.includes('quarantine') ||
            name.includes('faulty') ||
            name.includes('damaged') ||
            name.includes('hold') ||
            name.includes('scrap') ||
            name.includes('qc') ||
            name.includes('inspection')
        );
    }

    async getDefaultQuarantineBin(tx, item) {
        // Prefer a quarantine bin in the same godown as the original bin
        let godownId = null;
        if (item.binId) {
            const originalBin = await tx.bin.findUnique({
                where: { id: item.binId },
                select: { godownId: true, warehouseId: true, rackId: true, zoneId: true },
            });
            godownId = originalBin?.godownId || originalBin?.warehouseId;
            // (you can extend the same hierarchy walk you already use in processSortingReevaluation)
        }

        const quarantineBin = await tx.bin.findFirst({
            where: {
                ...(godownId && { godownId }),
                OR: [
                    { name: { contains: 'quarantine', mode: 'insensitive' } },
                    { name: { contains: 'faulty', mode: 'insensitive' } },
                    { name: { contains: 'damaged', mode: 'insensitive' } },
                    { name: { contains: 'hold', mode: 'insensitive' } },
                    { name: { contains: 'qc', mode: 'insensitive' } },
                ],
            },
        });

        if (quarantineBin) return quarantineBin.id;

        throw new AppError(
            'No Quarantine / Faulty / QC bin found. Create a bin named "Quarantine" or "Faulty" in the warehouse before receiving damaged returns.',
            400
        );
    }

    // ====================== GETTERS ======================
    async getPurchaseReturns(filters = {}) {
        return prisma.purchaseReturn.findMany({
            where: filters,
            include: {
                partner: true,
                items: {
                    include: {
                        productVariant: true,
                        reason: true,
                        bin: true,
                    },
                },
                processedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getCustomerReturns(filters = {}) {
        return prisma.customerReturn.findMany({
            where: filters,
            include: {
                partner: true,
                items: {
                    include: {
                        productVariant: true,
                        reason: true,
                        bin: true,
                    },
                },
                processedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getPurchaseReturnById(id) {
        const result = await prisma.purchaseReturn.findUnique({
            where: { id },
            include: {
                partner: true,
                purchaseOrder: true,
                grn: true,
                processedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        productVariant: { include: { product: true } },
                        bin: true,
                        batch: true,
                        reason: true,
                    },
                },
            },
        });
        if (!result) throw new AppError('Purchase Return not found', 404);
        return result;
    }

    async getCustomerReturnById(id) {
        const result = await prisma.customerReturn.findUnique({
            where: { id },
            include: {
                partner: true,
                salesOrder: true,
                processedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        productVariant: { include: { product: true } },
                        bin: true,
                        batch: true,
                        reason: true,
                    },
                },
            },
        });
        if (!result) throw new AppError('Customer Return not found', 404);
        return result;
    }

    async findSafeSaleableBin(tx, originalBinId, productVariantId) {
        // Simple fallback: any bin that is not quarantine and has the same godown
        // (you can later plug in putAwayEngine.findBestBin here)
        if (!originalBinId) return null;
        const original = await tx.bin.findUnique({
            where: { id: originalBinId },
            select: { godownId: true },
        });
        if (!original?.godownId) return null;

        const candidates = await tx.bin.findMany({
            where: { godownId: original.godownId },
            take: 20,
        });
        for (const b of candidates) {
            if (!(await this.isQuarantineBin(tx, b.id))) return b.id;
        }
        return null;
    }


    async getReturnableLinesFromSalesOrder(salesOrderIdOrNumber) {
        if (!salesOrderIdOrNumber) {
            throw new AppError('salesOrderId is required', 400);
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            .test(salesOrderIdOrNumber);

        const salesOrder = await prisma.salesOrder.findFirst({
            where: isUuid
                ? { id: salesOrderIdOrNumber }
                : {
                    OR: [
                        { invoiceNumber: { equals: salesOrderIdOrNumber, mode: 'insensitive' } },
                        { orderRef: { equals: salesOrderIdOrNumber, mode: 'insensitive' } },
                    ],
                },
            include: {
                partner: { select: { id: true, name: true } },
                items: {
                    include: {
                        productVariant: {
                            include: {
                                product: { select: { id: true, name: true, sku: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!salesOrder) {
            throw new AppError('Sales Order not found', 404);
        }

        // Already returned quantities
        const existingReturns = await prisma.customerReturnItem.findMany({
            where: {
                customerReturn: {
                    salesOrderId: salesOrder.id,          // ← use salesOrder.id
                    status: { in: ['DRAFT', 'APPROVED', 'RECEIVED'] },
                },
            },
            select: {
                productVariantId: true,
                quantityCount: true,
                originalSalesOrderItemId: true,
            },
        });

        const returnedMap = {};
        for (const r of existingReturns) {
            const key = r.originalSalesOrderItemId || r.productVariantId;
            returnedMap[key] = (returnedMap[key] || 0) + Number(r.quantityCount || 0);
        }

        // Get original Bin + Batch from StockMovement (SALES_OUT)
        const movements = await prisma.stockMovement.findMany({
            where: {
                type: 'SALES_OUT',
                referenceId: salesOrder.id,               // ← use salesOrder.id
            },
            select: {
                productVariantId: true,
                binId: true,
                batchId: true,
            },
        });

        const movementMap = {};
        for (const m of movements) {
            if (!movementMap[m.productVariantId]) {
                movementMap[m.productVariantId] = {
                    binId: m.binId,
                    batchId: m.batchId,
                };
            }
        }

        // Build returnable lines with fallback
        const returnableLines = await Promise.all(
            salesOrder.items.map(async (item) => {
                const alreadyReturned =
                    returnedMap[item.id] || returnedMap[item.productVariantId] || 0;

                const deliveredQty = Number(item.quantityCount || item.orderedQuantity || 0);
                const maxReturnable = Math.max(0, deliveredQty - alreadyReturned);

                if (maxReturnable <= 0) return null;

                const origin = movementMap[item.productVariantId] || {};
                let finalBinId = item.binId || origin.binId || null;
                let finalBatchId = origin.batchId || null;

                if (!finalBinId) {
                    const anyBalance = await prisma.inventoryBalance.findFirst({
                        where: {
                            productVariantId: item.productVariantId,
                            currentCount: { gt: 0 },
                        },
                        orderBy: { createdAt: 'desc' },
                        select: { binId: true, batchId: true },
                    });

                    if (anyBalance) {
                        finalBinId = anyBalance.binId;
                        finalBatchId = finalBatchId || anyBalance.batchId;
                    }
                }

                if (!finalBinId) {
                    const lastKnown = await prisma.inventoryBalance.findFirst({
                        where: { productVariantId: item.productVariantId },
                        orderBy: { createdAt: 'desc' },
                        select: { binId: true, batchId: true },
                    });

                    if (lastKnown) {
                        finalBinId = lastKnown.binId;
                        finalBatchId = finalBatchId || lastKnown.batchId;
                    }
                }

                return {
                    originalSalesOrderItemId: item.id,
                    productVariantId: item.productVariantId,
                    productName: item.productVariant?.product?.name || 'Unknown',
                    sku: item.productVariant?.product?.sku || '',
                    binId: finalBinId,
                    batchId: finalBatchId,
                    deliveredQty,
                    alreadyReturned,
                    maxReturnable,
                    quantityCount: maxReturnable,
                    quantityKg: Number(item.quantityKg) || 0,
                    conditionGrade: 'A',
                    disposition: 'QUARANTINE',
                    reasonId: '',
                    notes: '',
                };
            })
        );

        return {
            salesOrder: {
                id: salesOrder.id,
                orderNumber: salesOrder.invoiceNumber || salesOrder.orderRef || salesOrder.id,
                partnerId: salesOrder.partnerId,
                partnerName: salesOrder.partner?.name,
            },
            lines: returnableLines.filter(Boolean),
        };
    }
}

export default new ReturnService();
























