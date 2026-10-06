import prisma from '../lib/prisma.js';
import { createSalesAccountingEntries } from '../services/accounts/inventoryBridge.js';

// GET /api/sales - Get all sales orders
export const getSalesOrders = async (req, res) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        partner: true,
        items: {
          include: {
            productVariant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/sales/:id - Get single sales order
export const getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        partner: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
            allocations: {
              include: {
                bin: true,
                batch: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Sales Order not found' });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('[Sales Controller Error] getSalesOrderById:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// --- CRM / Partner Handlers ---
export const getCustomers = async (req, res) => {
  try {
    const partners = await prisma.partner.findMany();

    const customers = partners.filter(p => {
      const t = String(p.type || '').toUpperCase();
      return t.includes('CUSTOMER') || t.includes('CLIENT') || t === 'BUYER';
    });

    const dataToReturn = customers.length > 0 ? customers : partners;

    return res.json({ success: true, data: dataToReturn });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const customer = await prisma.partner.create({ data: req.body });
    return res.status(201).json({ success: true, data: customer });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// --- WMS Outbound / Sales Engine Route Wrappers ---
export const checkoutSale = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.createdById;

    // 1. Process Checkout (Allocates Stock)
    const result = await processSalesCheckout(req.body, userId);

    // 2. FORCE Auto-Dispatch to deduct physical stock & write to ledger immediately
    await dispatchOrderStock(result.id, userId);

    // Update the result status to reflect the completed/unpaid dispatch state
    result.status = result.status === 'ALLOCATED_PAID' ? 'SHIPPED_COMPLETED' : 'SHIPPED_UNPAID';

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Checkout Sale Error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
};

export const createSalesOrder = checkoutSale; // Alias

export const getPendingDispatches = async (req, res) => {
  try {
    const pendingOrders = await prisma.salesOrder.findMany({
      where: {
        status: { in: ['ALLOCATED_PENDING', 'ALLOCATED_PAID'] },
      },
      include: {
        items: {
          include: {
            productVariant: true,
            allocations: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: pendingOrders });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const dispatchOrder = async (req, res) => {
  try {
    const orderId = req.params.id || req.body.salesOrderId || req.body.orderId;
    const userId = req.user?.id || req.body.userId;
    const result = await dispatchOrderStock(orderId, userId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

export const dispatchSalesOrder = dispatchOrder; // Alias

// --- Core Transaction Functions ---
export const processSalesCheckout = async (payload, userId) => {
  const customerIdToUse = payload.customerId || payload.partnerId;

  if (!customerIdToUse) {
    throw new Error('A Customer ID (or Partner ID) is required to process checkout.');
  }

  return await prisma.$transaction(async (tx) => {
    // 0. Safeguard: Ensure valid user ID
    let validUserId = userId;
    if (validUserId) {
      const userExists = await tx.user.findUnique({ where: { id: validUserId } });
      if (!userExists) validUserId = null;
    }
    if (!validUserId) {
      const fallbackUser = await tx.user.findFirst();
      if (fallbackUser) {
        validUserId = fallbackUser.id;
      } else {
        throw new Error('No user found in the database to associate with this order.');
      }
    }

    // 1. Ensure a Customer record exists
    const partnerRecord = await tx.partner.findUnique({
      where: { id: customerIdToUse },
    });

    if (partnerRecord) {
      await tx.customer.upsert({
        where: { id: customerIdToUse },
        update: {
          name: partnerRecord.name,
        },
        create: {
          id: customerIdToUse,
          name: partnerRecord.name || 'Walk-in Customer',
          phone: partnerRecord.phone || `N/A-${Date.now()}`,
        },
      });
    }

    // 2. Parse Financial Figures Correctly
    const calculatedSubtotal = payload.items.reduce(
        (sum, item) => sum + (Number(item.orderedQuantity || 0) * Number(item.unitPrice || 0)),
        0
    );

    const courierCost = Number(
        payload.courierCost ?? payload.shippingCost ?? payload.deliveryFee ?? 0
    );

    const taxAmount = Number(
        payload.taxAmount ?? payload.vatAmount ?? 0
    );

    const advancePaid = Number(
        payload.receivedAmount ?? payload.paidAmount ?? payload.advancePaid ?? payload.paid ?? 0
    );

    const totalAmount = Number(
        payload.totalAmount ?? (calculatedSubtotal + courierCost + taxAmount)
    );

    const balanceDue = Number(
        payload.balanceDue ?? payload.dueAmount ?? Math.max(0, totalAmount - advancePaid)
    );

    // 3. Create Sales Order Header & Items using EXACT Schema Fields ONLY
    const order = await tx.salesOrder.create({
      data: {
        invoiceNumber: payload.invoiceNumber || `INV-${Date.now()}`,
        orderRef: payload.orderRef || `SO-${Date.now()}`,

        customer: {
          connect: { id: customerIdToUse }
        },

        partner: {
          connect: { id: payload.partnerId || customerIdToUse }
        },

        createdBy: {
          connect: { id: validUserId }
        },

        // Financial Mapping Matching Schema Exactly
        totalAmount: totalAmount,
        courierCost: courierCost,
        receivedAmount: advancePaid,
        balanceDue: balanceDue,
        taxAmount: taxAmount,

        ...(payload.taxName && { taxName: payload.taxName }),
        ...(payload.taxRate && { taxRate: Number(payload.taxRate) }),

        paymentMethod: payload.paymentMethod || 'CASH',
        status: payload.paymentStatus === 'PAID' ? 'ALLOCATED_PAID' : 'ALLOCATED_PENDING',

        items: {
          create: payload.items.map((item) => ({
            productVariantId: item.productVariantId,
            orderedQuantity: Number(item.orderedQuantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.orderedQuantity) * Number(item.unitPrice),
          })),
        },
      },
      include: { items: true },
    });

    const userGodownId = payload.godownId || payload.warehouseId || null;

    // 4. Warehouse-Prioritized FIFO Stock Reservation Engine
    for (const orderItem of order.items) {
      let remainingToAllocate = orderItem.orderedQuantity;

      const availableBalances = await tx.inventoryBalance.findMany({
        where: {
          productVariantId: orderItem.productVariantId,
          currentCount: { gt: 0 },
        },
        include: {
          batch: true,
          bin: {
            include: {
              shelf: {
                include: {
                  rack: {
                    include: {
                      aisle: {
                        include: {
                          room: { include: { zone: { include: { godown: true } } } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          batch: { createdAt: 'asc' },
        },
      });

      if (userGodownId) {
        availableBalances.sort((a, b) => {
          const godownA = a.bin?.shelf?.rack?.aisle?.room?.zone?.godownId;
          const godownB = b.bin?.shelf?.rack?.aisle?.room?.zone?.godownId;
          if (godownA === userGodownId && godownB !== userGodownId) return -1;
          if (godownA !== userGodownId && godownB === userGodownId) return 1;
          return 0;
        });
      }

      for (const balance of availableBalances) {
        if (remainingToAllocate <= 0) break;

        const availableInBin = balance.currentCount - balance.allocatedCount;
        if (availableInBin <= 0) continue;

        const qtyToTake = Math.min(remainingToAllocate, availableInBin);

        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: {
            allocatedCount: { increment: qtyToTake },
          },
        });

        await tx.stockAllocation.create({
          data: {
            salesOrderItemId: orderItem.id,
            batchId: balance.batchId,
            binId: balance.binId,
            allocatedCount: qtyToTake,
          },
        });

        remainingToAllocate -= qtyToTake;
      }

      if (remainingToAllocate > 0) {
        throw new Error(
            `Insufficient available stock across warehouses for SKU/Variant ID: ${orderItem.productVariantId}. Short by ${remainingToAllocate} unit(s).`
        );
      }
    }

    return await tx.salesOrder.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        partner: true,
        items: {
          include: {
            productVariant: {
              include: { product: true }
            },
            allocations: {
              include: { bin: true, batch: true },
            },
          },
        },
      },
    });
  });
};

export const dispatchOrderStock = async (salesOrderId, userId) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        items: {
          include: {
            allocations: {
              include: { bin: true },
            },
            productVariant: {
              select: {
                purchasePrice: true,
                price: true,
                sku: true,
              }
            }
          },
        },
      },
    });

    if (!order) {
      throw new Error('Sales Order not found.');
    }

    if (!['ALLOCATED_PENDING', 'ALLOCATED_PAID'].includes(order.status)) {
      throw new Error(`Order cannot be dispatched. Current status: "${order.status}".`);
    }

    let totalCogs = 0;

    for (const item of order.items) {
      if (!item.allocations || item.allocations.length === 0) {
        throw new Error(
            `Data Drift Error: No stock allocations found for item ${item.id} on order ${order.invoiceNumber}.`
        );
      }

      const variantMeta = await tx.productVariant.findUnique({
        where: { id: item.productVariantId },
        select: { weightKg: true, volumeCm3: true, sku: true, purchasePrice: true, price: true },
      });

      for (const allocation of item.allocations) {
        const qtyToDeduct = allocation.allocatedCount;
        const computedKg = qtyToDeduct * (variantMeta?.weightKg ? Number(variantMeta.weightKg) : 0);
        const computedCm3 = qtyToDeduct * (variantMeta?.volumeCm3 ? Number(variantMeta.volumeCm3) : 0);

        // Calculate COGS
        const unitCost = Number(variantMeta?.purchasePrice || variantMeta?.price || 0);
        totalCogs += unitCost * qtyToDeduct;

        const balance = await tx.inventoryBalance.findFirst({
          where: {
            productVariantId: item.productVariantId,
            binId: allocation.binId,
            batchId: allocation.batchId,
          },
        });

        if (!balance || balance.currentCount < qtyToDeduct) {
          throw new Error(
              `Stock Discrepancy: Bin "${allocation.bin.name}" has insufficient stock for SKU: ${
                  variantMeta?.sku || item.productVariantId
              }. Available: ${balance?.currentCount || 0}, Attempted: ${qtyToDeduct}`
          );
        }

        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: {
            currentCount: { decrement: qtyToDeduct },
            allocatedCount: { decrement: qtyToDeduct },
            currentKg: { decrement: computedKg },
            lastStockMovement: new Date(),
          },
        });

        await tx.bin.update({
          where: { id: allocation.binId },
          data: {
            currentWeight: { decrement: computedKg },
            currentVolume: { decrement: computedCm3 },
          },
        });

        await tx.stockLedger.create({
          data: {
            type: 'SALES_OUTBOUND',
            productVariantId: item.productVariantId,
            sourceBinId: allocation.binId,
            quantityCount: -Math.abs(qtyToDeduct),
            quantityKg: -Math.abs(computedKg),
            reference: order.invoiceNumber,
            notes: `Dispatched & shipped via Invoice: ${order.invoiceNumber}`,
          },
        });
      }
    }

    const finalStatus = order.status === 'ALLOCATED_PAID' ? 'SHIPPED_COMPLETED' : 'SHIPPED_UNPAID';

    const updatedOrder = await tx.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: finalStatus },
    });

// =====================================================
// ACCOUNTING BRIDGE – Sales + COGS
// =====================================================
    try {
      await createSalesAccountingEntries(tx, {
        salesOrder: order,
        userId,
        totalRevenue: Number(order.totalAmount || 0),
        totalCogs: totalCogs,
        paymentMethod: order.paymentMethod || 'CASH',
      });

      console.log(`[dispatchOrderStock] Sales accounting posted for Invoice: ${order.invoiceNumber}`);
    } catch (accError) {
      console.error('[dispatchOrderStock] Accounting bridge failed:', accError.message);
      // Stock movement still succeeds
    }

    return updatedOrder;
  });
};

export const recordPartialPayment = async (req, res) => {
  try {
    const salesOrderId = req.params.id;
    const {
      amount,
      paymentMethod = 'CASH',
      paymentReference = null,
      narration = null
    } = req.body || {};

    console.log('[recordPartialPayment] Incoming →', {
      salesOrderId,
      amount,
      paymentMethod,
      paymentReference,
      narration
    });

    if (!salesOrderId) {
      return res.status(400).json({
        success: false,
        error: 'Sales Order ID is required'
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required'
      });
    }

    const userId = req.user?.id || null;

    // Dynamic import is fine, but wrap it tightly
    const { recordSalesPartialPayment } = await import('../services/salesService.js');

    const result = await recordSalesPartialPayment({
      salesOrderId,
      amount: Number(amount),
      paymentMethod,
      paymentReference,
      narration,
      userId
    });

    return res.status(200).json({
      success: true,
      message: `Payment of ${result.paidNow} recorded successfully. Remaining due: ${result.remainingDue}`,
      data: result
    });
  } catch (error) {
    // THIS IS THE MOST IMPORTANT PART
    console.error('[recordPartialPayment] CAUGHT ERROR:', error);
    console.error(error.stack);

    // Always send a JSON response so the browser never sees "Failed to fetch"
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to record payment'
    });
  }
};