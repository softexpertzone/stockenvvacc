import prisma from '../config/db.js';

// Record a new transaction (Payment or Receipt)
export const createTransaction = async (req, res) => {
  try {
    const {
      amount,
      type, // 'SALE' (Incoming) or 'PURCHASE' (Outgoing)
      partnerId,
      salesOrderId,
      purchaseOrderId,
      paymentMethod,
      notes
    } = req.body;

    // Use a transaction to ensure atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Transaction Record
      const transaction = await tx.transaction.create({
        data: {
          amount: parseFloat(amount),
          type,
          partnerId,
          salesOrderId,
          purchaseOrderId,
          paymentMethod,
          notes
        }
      });

      // 2. Automatically update the Sales Order if linked
      if (salesOrderId) {
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: {
            receivedAmount: { increment: parseFloat(amount) },
            balanceDue: { decrement: parseFloat(amount) }
          }
        });
      }

      return transaction;
    });

    res.status(201).json({ success: true, transaction: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to record transaction: " + error.message });
  }
};

// Fetch financial transactions with their related order details
export const getFinanceSummary = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
      include: {
        salesOrder: { select: { invoiceNumber: true } },
        purchaseOrder: { select: { purchaseNumber: true } },
        partner: { select: { companyName: true } }
      }
    });
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ledger: " + error.message });
  }
};