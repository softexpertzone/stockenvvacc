import prisma from '../lib/prisma.js';


// ==========================================
// 1. GET INVENTORY (LEDGER)
// ==========================================
export const getInventory = async (req, res) => {
  try {
    const inventoryData = await prisma.inventoryBalance.findMany({
      where: { currentCount: { gt: 0 } },
      include: {
        productVariant: { include: { product: true } },
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
      }
    });

    const formattedData = inventoryData.map((item) => {
      const b = item.bin;
      const s = b?.shelf;
      const r = s?.rack;
      const a = r?.aisle;
      const rm = a?.room;
      const z = rm?.zone;
      const g = z?.godown;

      const locationTreePath = g ? `${g.name} > ${z.name} > ${rm.name} > ${a.name} > ${r.name} > ${s.name} > ${b.name}` : 'Unassigned';

      return {
        id: item.id,
        sku: item.productVariant?.sku || 'N/A',
        productName: item.productVariant?.product?.name || 'Unknown',
        locationPath: locationTreePath,
        binName: b?.name || 'N/A',
        qty: item.currentCount,
        value: (Number(item.currentCount) * Number(item.productVariant?.price || 0)).toFixed(2)
      };
    });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Ledger Fetch Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch inventory ledger" });
  }
};

// ==========================================
// GODOWN-SPECIFIC CURRENT INVENTORY (Best for Search Result Stock)
// ==========================================
export const getGodownInventory = async (req, res) => {
  const { godownId } = req.query;

  if (!godownId) {
    return res.status(400).json({ success: false, error: "godownId is required for godown-specific search." });
  }

  try {
    const inventoryData = await prisma.inventoryBalance.findMany({
      where: {
        currentCount: { gt: 0 },
        bin: {
          shelf: {
            rack: {
              aisle: {
                room: {
                  zone: { godownId: godownId }
                }
              }
            }
          }
        }
      },
      include: {
        productVariant: { include: { product: true } },
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
      }
    });

    const formattedData = inventoryData.map((item) => {
      const b = item.bin;
      const s = b?.shelf;
      const r = s?.rack;
      const a = r?.aisle;
      const rm = a?.room;
      const z = rm?.zone;
      const g = z?.godown;

      const locationTreePath = g ? `${g.name} > ${z.name} > ${rm.name} > ${a.name} > ${r.name} > ${s.name} > ${b.name}` : 'Unassigned';

      return {
        id: item.id,
        sku: item.productVariant?.sku || 'N/A',
        productName: item.productVariant?.product?.name || 'Unknown',
        locationPath: locationTreePath,
        binName: b?.name || 'N/A',
        qty: item.currentCount,
        value: (Number(item.currentCount) * Number(item.productVariant?.price || 0)).toFixed(2),
        godownId: g?.id,
        godownName: g?.name
      };
    });

    const totalQty = formattedData.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const totalValue = formattedData.reduce((sum, item) => sum + Number(item.value || 0), 0);

    res.json({
      success: true,
      data: formattedData,
      summary: { totalQty, totalValue, godownId, itemCount: formattedData.length }
    });
  } catch (error) {
    console.error("Godown Inventory Fetch Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch godown inventory" });
  }
};

// ==========================================
// 2. UPDATE STOCK (ADJUSTMENTS WITH BATCH)
// ==========================================
export const updateStock = async (req, res) => {
  const { binId, productVariantId, quantityChange, reason, batchNumber } = req.body;

  if (!batchNumber) {
    return res.status(400).json({ success: false, error: "Batch number is required." });
  }

  try {
    // 1. Get or Create the Batch
    let batch = await prisma.batch.findUnique({
      where: { batchNumber: batchNumber }
    });

    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          batchNumber: batchNumber,
          productVariantId: productVariantId,
          status: "ACTIVE"
        }
      });
    }

    // 2. Fetch Bin, Product, and specific Balance
    const [bin, product, currentBalance] = await Promise.all([
      prisma.bin.findUnique({
        where: { id: binId },
        include: { inventoryBalances: { include: { productVariant: true } } }
      }),
      prisma.productVariant.findUnique({ where: { id: productVariantId } }),
      prisma.inventoryBalance.findUnique({
        where: {
          productVariantId_binId_batchId: {
            productVariantId,
            binId,
            batchId: batch.id
          }
        }
      })
    ]);

    if (!bin || !product) {
      return res.status(404).json({ success: false, error: "Bin or Product not found" });
    }

    // --- CASE A: REDUCING STOCK (Picking/Shipping) ---
    if (quantityChange < 0) {
      if (!currentBalance || currentBalance.currentCount < Math.abs(quantityChange)) {
        return res.status(400).json({ success: false, error: "Insufficient stock in this bin for this batch." });
      }
    }

    // --- CASE B: ADDING STOCK (GRN/Transfer In) ---
    else if (quantityChange > 0) {
      let currentWeight = 0;
      let currentVolume = 0;

      bin.inventoryBalances.forEach(ib => {
        currentWeight += ib.currentCount * Number(ib.productVariant.weightKg || 0);
        currentVolume += ib.currentCount * Number(ib.productVariant.volumeCm3 || 0);
      });

      const newWeight = currentWeight + (quantityChange * Number(product.weightKg || 0));
      const newVolume = currentVolume + (quantityChange * Number(product.volumeCm3 || 0));

      if (Number(bin.maxWeightKg) > 0 && newWeight > Number(bin.maxWeightKg)) {
        return res.status(400).json({ success: false, error: "Capacity Exceeded: Weight limit reached." });
      }
      if (Number(bin.maxVolumeCm3) > 0 && newVolume > Number(bin.maxVolumeCm3)) {
        return res.status(400).json({ success: false, error: "Capacity Exceeded: Volume limit reached." });
      }
    }

    const calculatedKg = Math.abs(quantityChange) * Number(product.weightKg || 0);

    // --- ATOMIC UPDATE ---
    await prisma.$transaction(async (tx) => {
      await tx.inventoryBalance.upsert({
        where: {
          productVariantId_binId_batchId: {
            productVariantId,
            binId,
            batchId: batch.id
          }
        },
        update: { currentCount: { increment: quantityChange } },
        create: {
          productVariantId,
          binId,
          batchId: batch.id,
          currentCount: quantityChange
        }
      });

      await tx.stockLedger.create({
        data: {
          productVariantId,
          destinationBinId: quantityChange > 0 ? binId : null,
          sourceBinId: quantityChange < 0 ? binId : null,
          quantityCount: Math.abs(quantityChange),
          quantityKg: calculatedKg,
          type: quantityChange > 0 ? 'ADJUSTMENT' : 'SALES_OUTBOUND',
          reference: `ADJ-${Date.now()}`,
          notes: `${reason} | Batch: ${batchNumber}`
        }
      });
    });

    res.status(200).json({ success: true, message: "Stock processed successfully.", batchId: batch.id });
  } catch (error) {
    console.error("Stock Update Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// Suggest Transfer Plan (Resolves Frontend 404)
// ==========================================
// ==========================================
// Suggest Transfer Plan (True FIFO – multi-batch)
// ==========================================
export const suggestTransferPlan = async (req, res, next) => {
  try {
    const { productVariantId, requestedQty, sourceGodownId } = req.query;

    if (!productVariantId || !sourceGodownId || !requestedQty) {
      return res.status(400).json({
        success: false,
        message: "productVariantId, sourceGodownId and requestedQty are required"
      });
    }

    const qtyNeeded = parseInt(requestedQty, 10);
    if (isNaN(qtyNeeded) || qtyNeeded <= 0) {
      return res.status(400).json({ success: false, message: "Invalid quantity" });
    }

    // Fetch all positive balances for this product in the source godown,
    // oldest first (true FIFO). Adjust orderBy if you have a better date field.
    const balances = await prisma.inventoryBalance.findMany({
      where: {
        productVariantId,
        currentCount: { gt: 0 },
        bin: {
          shelf: {
            rack: {
              aisle: {
                room: {
                  zone: { godownId: sourceGodownId }
                }
              }
            }
          }
        }
      },
      include: {
        batch: true,
        bin: true
      },
      orderBy: [
        { batch: { createdAt: 'asc' } },   // oldest batch first
        { createdAt: 'asc' }
      ]
    });

    if (balances.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No stock found for this product in the selected source warehouse."
      });
    }

    let remaining = qtyNeeded;
    const allocationPlan = [];

    for (const bal of balances) {
      if (remaining <= 0) break;

      const available = bal.currentCount;
      const take = Math.min(available, remaining);

      allocationPlan.push({
        productVariantId,
        batchId: bal.batchId,
        batchNumber: bal.batch?.batchNumber || bal.batchId,
        qtyToPick: take,
        sourceBinId: bal.binId,
        sourceBinName: bal.bin?.name || null
      });

      remaining -= take;
    }

    if (remaining > 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${qtyNeeded - remaining} units available in source warehouse.`
      });
    }

    return res.status(200).json({
      success: true,
      allocationPlan
    });
  } catch (error) {
    console.error("suggestTransferPlan error:", error);
    next(error);
  }
};


// ==========================================
// 3. GET PRODUCTS
// ==========================================
export const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { productVariants: true }
    });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 6. SUGGEST BEST BIN (Slotting Engine)
// ==========================================
// ==========================================
// 6. SUGGEST BEST BIN (Slotting Engine) - IMPROVED
// ==========================================
export const getSuggestedBins = async (req, res) => {
  const { productVariantId, quantity, godownId } = req.query; // Added godownId filter

  if (!productVariantId || !quantity) {
    return res.status(400).json({ success: false, error: "Missing productVariantId or quantity" });
  }

  try {
    const qty = Number(quantity);

    const product = await prisma.productVariant.findUnique({ where: { id: productVariantId } });
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });

    const requiredWeight = qty * Number(product.weightKg || 0);
    const requiredVolume = qty * Number(product.volumeCm3 || 0);

    // Filter bins by godown if provided
    const whereClause = godownId ? {
      shelf: { rack: { aisle: { room: { zone: { godownId } } } } }
    } : {};

    const allBins = await prisma.bin.findMany({
      where: whereClause,
      include: {
        inventoryBalances: { include: { productVariant: true } }
      }
    });

    if (allBins.length === 0) {
      return res.status(400).json({ success: false, error: "No bins found in the selected godown." });
    }

    const suggestions = allBins.map(bin => {
      let currentW = 0;
      let currentV = 0;
      let hasProduct = false;

      bin.inventoryBalances.forEach(ib => {
        currentW += ib.currentCount * Number(ib.productVariant.weightKg || 0);
        currentV += ib.currentCount * Number(ib.productVariant.volumeCm3 || 0);
        if (ib.productVariantId === productVariantId) hasProduct = true;
      });

      const remainingW = Number(bin.maxWeightKg || Infinity) - currentW;
      const remainingV = Number(bin.maxVolumeCm3 || Infinity) - currentV;

      const isViable = remainingW >= requiredWeight && remainingV >= requiredVolume;

      let score = 0;
      if (isViable) {
        score += 100;
        if (hasProduct) score += 50;
        if (bin.inventoryBalances.length === 0) score += 30; // Prefer empty bins
      }

      return {
        binId: bin.id,
        binName: bin.name,
        isViable,
        score,
        remainingCapacity: { weight: remainingW, volume: remainingV }
      };
    });

    const bestBins = suggestions
        .filter(s => s.isViable)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    if (bestBins.length === 0) {
      return res.status(400).json({ success: false, error: "No bin available with sufficient capacity in this godown." });
    }

    res.json({ success: true, data: bestBins });
  } catch (error) {
    console.error("Suggest Bin Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 4. EXECUTE TRANSFER (Legacy Direct Transfer)
// ==========================================

export const executeTransfer = async (req, res) => {
  console.log("DEBUG: Payload Received in executeTransfer:", JSON.stringify(req.body, null, 2));

  const payload = req.body;
  const items = payload.items || [payload];

  if (items.length === 0) {
    return res.status(400).json({ success: false, error: "No transfer items provided." });
  }

  try {
    const results = [];

    for (const item of items) {
      let {
        sourceBinId,
        destinationBinId,
        productVariantId,
        quantity,
        batchId,
        destinationGodownId
      } = item;

      quantity = parseInt(quantity) || 0;

      // Auto-resolve batch
      if (!batchId || batchId === "ACTUAL-BATCH-REF") {
        const stock = await prisma.inventoryBalance.findFirst({
          where: {
            productVariantId,
            binId: sourceBinId,
            currentCount: { gte: quantity }
          }
        });
        if (stock) batchId = stock.batchId;
        else return res.status(400).json({ success: false, error: "No stock found in source bin." });
      }

      // === IMPROVED DESTINATION BIN FALLBACK ===
      if (!destinationBinId || destinationBinId === 'DEFAULT-BIN') {
        let fallbackBin = await prisma.bin.findFirst({
          where: {
            shelf: {
              rack: {
                aisle: {
                  room: {
                    zone: { godownId: destinationGodownId }
                  }
                }
              }
            }
          }
        });

        if (!fallbackBin) {
          fallbackBin = await prisma.bin.findFirst(); // last resort
        }

        if (!fallbackBin) {
          return res.status(400).json({ success: false, error: "No destination bin available in the target godown." });
        }

        destinationBinId = fallbackBin.id;
      }

      // Fetch data
      const [sourceBin, destBin, product] = await Promise.all([
        prisma.bin.findUnique({
          where: { id: sourceBinId },
          include: { inventoryBalances: { include: { productVariant: true } } }
        }),
        prisma.bin.findUnique({
          where: { id: destinationBinId },
          include: { inventoryBalances: { include: { productVariant: true } } }
        }),
        prisma.productVariant.findUnique({ where: { id: productVariantId } })
      ]);

      if (!sourceBin || !destBin || !product) {
        return res.status(404).json({ success: false, error: "Source/Dest bin or product not found." });
      }

      const sourceBalance = sourceBin.inventoryBalances.find(ib =>
          ib.productVariantId === productVariantId && ib.batchId === batchId
      );

      if (!sourceBalance || sourceBalance.currentCount < quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock in source bin for batch ${batchId}.`
        });
      }

      // Capacity check
      const destCurrentWeight = destBin.inventoryBalances.reduce((sum, ib) =>
          sum + (ib.currentCount * Number(ib.productVariant?.weightKg || 0)), 0);
      const destCurrentVolume = destBin.inventoryBalances.reduce((sum, ib) =>
          sum + (ib.currentCount * Number(ib.productVariant?.volumeCm3 || 0)), 0);

      const addedWeight = quantity * Number(product.weightKg || 0);
      const addedVolume = quantity * Number(product.volumeCm3 || 0);

      if (Number(destBin.maxWeightKg) > 0 && (destCurrentWeight + addedWeight) > Number(destBin.maxWeightKg)) {
        return res.status(400).json({ success: false, error: "Destination bin capacity exceeded (Weight)." });
      }
      if (Number(destBin.maxVolumeCm3) > 0 && (destCurrentVolume + addedVolume) > Number(destBin.maxVolumeCm3)) {
        return res.status(400).json({ success: false, error: "Destination bin capacity exceeded (Volume)." });
      }

      // Execute transfer
      await prisma.$transaction(async (tx) => {
        await tx.inventoryBalance.update({
          where: { productVariantId_binId_batchId: { productVariantId, binId: sourceBinId, batchId } },
          data: { currentCount: { decrement: quantity } }
        });

        await tx.inventoryBalance.upsert({
          where: { productVariantId_binId_batchId: { productVariantId, binId: destinationBinId, batchId } },
          update: { currentCount: { increment: quantity } },
          create: {
            productVariantId,
            binId: destinationBinId,
            batchId,
            currentCount: quantity
          }
        });

        await tx.stockLedger.create({
          data: {
            productVariantId,
            sourceBinId,
            destinationBinId,
            quantityCount: quantity,
            quantityKg: addedWeight,
            type: 'INTERNAL_TRANSFER',
            reference: `TRF-${Date.now()}`,
            notes: `Transfer from ${sourceBin.name} to ${destBin.name}`
          }
        });
      });

      results.push({ success: true, item });
    }

    res.status(200).json({
      success: true,
      message: "Transfer completed successfully.",
      transferred: results
    });

  } catch (error) {
    console.error("Transfer Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// ==========================================
// 5. WAREHOUSE LAYOUT
// ==========================================
export const getWarehouseLayout = async (req, res) => {
  try {
    const layout = await prisma.godown.findMany({
      include: {
        zones: {
          include: {
            rooms: {
              include: {
                aisles: {
                  include: {
                    racks: {
                      include: {
                        shelves: {
                          include: {
                            bins: {
                              include: {
                                inventoryBalances: {
                                  where: { currentCount: { gt: 0 } },
                                  include: { productVariant: { include: { product: true } } }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const dynamicCapacityLayout = layout.map(g => ({
      ...g,
      zones: g.zones.map(z => ({
        ...z,
        rooms: z.rooms.map(rm => ({
          ...rm,
          aisles: rm.aisles.map(a => ({
            ...a,
            racks: a.racks.map(r => ({
              ...r,
              shelves: r.shelves.map(s => ({
                ...s,
                bins: s.bins.map(b => {
                  let totalWeight = 0;
                  let totalVolume = 0;

                  b.inventoryBalances.forEach(ib => {
                    totalWeight += ib.currentCount * Number(ib.productVariant.weightKg || 0);
                    totalVolume += ib.currentCount * Number(ib.productVariant.volumeCm3 || 0);
                  });

                  return {
                    ...b,
                    metrics: {
                      currentWeightKg: totalWeight,
                      currentVolumeCm3: totalVolume,
                      weightUtilizationPct: Number(b.maxWeightKg) > 0 ? ((totalWeight / Number(b.maxWeightKg)) * 100).toFixed(1) : 0,
                      volumeUtilizationPct: Number(b.maxVolumeCm3) > 0 ? ((totalVolume / Number(b.maxVolumeCm3)) * 100).toFixed(1) : 0
                    }
                  };
                })
              }))
            }))
          }))
        }))
      }))
    }));

    res.json({ success: true, data: dynamicCapacityLayout });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getGodowns = async (req, res) => {
  try {
    const godowns = await prisma.godown.findMany({
      select: { id: true, name: true }
    });
    res.json({ success: true, data: godowns });
  } catch (error) {
    console.error("Godown Fetch Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch warehouses" });
  }
};

// ==========================================
// 7. GET STOCK LEDGER HISTORY (Movements)
// ==========================================
export const getLedgerHistory = async (req, res) => {
  const { godownId } = req.query;

  try {
    const ledgerWhere = godownId ? {
      OR: [
        { sourceBin: { shelf: { rack: { aisle: { room: { zone: { godownId: godownId } } } } } } },
        { destinationBin: { shelf: { rack: { aisle: { room: { zone: { godownId: godownId } } } } } } }
      ]
    } : {};

    const balanceWhere = godownId ? {
      bin: { shelf: { rack: { aisle: { room: { zone: { godownId: godownId } } } } } }
    } : {};

    const [ledgers, stockAggregate] = await Promise.all([
      prisma.stockLedger.findMany({
        where: ledgerWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          productVariant: { include: { product: true } },
          sourceBin: {
            include: { shelf: { include: { rack: { include: { aisle: { include: { room: { include: { zone: { include: { godown: true } } } } } } } } } } }
          },
          destinationBin: {
            include: { shelf: { include: { rack: { include: { aisle: { include: { room: { include: { zone: { include: { godown: true } } } } } } } } } } }
          }
        }
      }),
      prisma.inventoryBalance.aggregate({
        // Updated to include allocatedCount
        _sum: { currentCount: true, allocatedCount: true },
        where: balanceWhere
      })
    ]);

    const buildPath = (b) => {
      if (!b) return null;
      const s = b?.shelf;
      const r = s?.rack;
      const a = r?.aisle;
      const rm = a?.room;
      const z = rm?.zone;
      const g = z?.godown;
      return g ? `${g.name} > ${z.name} > ${rm.name} > ${a.name} > ${r.name} > ${s.name} > ${b.name}` : `Bin: ${b.name}`;
    };

    const formattedData = ledgers.map((log) => {
      let displayType = log.type;
      if (log.type === 'SALES_OUTBOUND' || log.type === 'SALE') displayType = 'DISPATCH';
      if (log.type === 'INTERNAL_TRANSFER') displayType = 'TRANSFER';

      let qty = Number(log.quantityCount);

      const sourceGodownId = log.sourceBin?.shelf?.rack?.aisle?.room?.zone?.godown?.id;
      const destGodownId = log.destinationBin?.shelf?.rack?.aisle?.room?.zone?.godown?.id;

      // Strong directional logic for transfers
      if (displayType === 'DISPATCH' || (displayType === 'ADJUSTMENT' && !log.destinationBinId)) {
        qty = -Math.abs(qty);
      } else if (displayType === 'TRANSFER' && godownId) {
        if (sourceGodownId === godownId) {
          qty = -Math.abs(qty);                    // Source godown = DEDUCT
        } else if (destGodownId === godownId) {
          qty = Math.abs(qty);                     // Destination godown = ADD
        }
      }

      return {
        id: log.id,
        createdAt: log.createdAt,
        reference: log.reference || log.notes?.split('|')[0]?.trim() || `SYS-${log.id}`,
        type: displayType,
        sku: log.productVariant?.sku || 'N/A',
        productName: log.productVariant?.product?.name || 'Unknown',
        fromLocation: buildPath(log.sourceBin) || 'External / System',
        toLocation: buildPath(log.destinationBin) || 'External / System',
        quantity: qty,
        userName: 'System',
        isDeduction: qty < 0
      };
    });

    // Updated to subtract allocated stock from current physical count
    const currentQty = Number(stockAggregate._sum.currentCount || 0);
    const allocatedQty = Number(stockAggregate._sum.allocatedCount || 0);
    const totalQuantity = currentQty - allocatedQty;

    res.json({ success: true, data: formattedData, totalQuantity });
  } catch (error) {
    console.error("Ledger Fetch Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ledger history" });
  }
};

// ==========================================
// GET INVENTORY LEVELS (Grouped by Variant/SKU)
// ==========================================
export const getInventoryLevels = async (req, res) => {
  try {
    const balances = await prisma.inventoryBalance.findMany({
      include: {
        productVariant: {
          include: { product: true }
        },
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
        },
        batch: true
      }
    });

    const formattedData = balances.map((item) => {
      const b = item.bin;
      const s = b?.shelf;
      const r = s?.rack;
      const a = r?.aisle;
      const rm = a?.room;
      const z = rm?.zone;
      const g = z?.godown;

      const locationTreePath = g
          ? `${g.name} > ${z.name} > ${rm.name} > ${a.name} > ${r.name} > ${s.name} > ${b.name}`
          : 'Unassigned';

      // Calculate available stock to match the sales page
      const allocated = item.allocatedCount || 0;
      const available = item.currentCount - allocated;

      return {
        id: item.id,
        sku: item.productVariant?.sku || 'N/A',
        productName: item.productVariant?.product?.name || 'Unknown',
        batchNumber: item.batch?.batchNumber || 'N/A',
        locationPath: locationTreePath,
        binName: b?.name || 'N/A',
        godownName: g?.name || 'N/A',
        qty: item.currentCount,           // Total physical stock
        allocatedQty: allocated,          // Stock reserved for pending orders
        availableQty: available,          // True available stock (Matches Sales Page)
        value: (Number(item.currentCount) * Number(item.productVariant?.price || 0)).toFixed(2)
      };
    });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Inventory Levels Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch inventory levels" });
  }
};
// =========================================================================
// ENTERPRISE TWO-PHASE TRANSFER WORKFLOW (PER-ITEM BATCH TRACKING)
// =========================================================================
export const getDetailedInventory = async (req, res) => {
  try {
    const detailedStock = await prisma.inventoryBalance.findMany({
      include: {
        productVariant: {
          include: { product: true }
        },
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
        },
        batch: true
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedData = detailedStock.map((item) => {
      const b = item.bin;
      const s = b?.shelf;
      const r = s?.rack;
      const a = r?.aisle;
      const rm = a?.room;
      const z = rm?.zone;
      const g = z?.godown;

      return {
        id: item.id,
        variantId: item.productVariantId,
        sku: item.productVariant?.sku || 'N/A',
        productName: item.productVariant?.product?.name || 'Unknown',
        batchId: item.batchId,
        batchNumber: item.batch?.batchNumber || 'N/A',
        binId: item.binId,
        binName: b?.name || 'N/A',
        godownId: g?.id || 'N/A',
        godownName: g?.name || 'N/A',
        currentCount: item.currentCount,
        allocatedCount: item.allocatedCount || 0,
        weightKg: Number(item.currentCount) * Number(item.productVariant?.weightKg || 0),
        volumeCm3: Number(item.currentCount) * Number(item.productVariant?.volumeCm3 || 0),
        lastUpdated: item.updatedAt
      };
    });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Detailed Inventory Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch detailed inventory" });
  }
};
// PHASE 1: PLAN & VALIDATE (Captures per-item batchId)
export const planTransfer = async (req, res) => {
  const { referenceType, scheduledDate, notes, items, processedBy } = req.body;

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items provided for transfer." });
    }

    const workflowNotes = `[STATUS: PLANNED] [SCHEDULED: ${scheduledDate}] | ${notes || ''}`;

    const variantIds = items.map(i => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } }
    });

    const variantMap = new Map(variants.map(v => [v.id, v]));

    const transferOrder = await prisma.internalTransfer.create({
      data: {
        transferRef: `TRF-${Date.now().toString().slice(-6)}`,
        processedBy: processedBy || 'System Operator',
        notes: workflowNotes,
        items: {
          create: items.map(item => {
            const variant = variantMap.get(item.variantId);
            const unitWeight = variant ? Number(variant.weightKg || 0) : 0;

            return {
              productVariantId: item.variantId,
              sourceBinId: item.sourceBinId,
              destinationBinId: item.destinationBinId,
              batchId: item.batchId, // Explicitly saved per line item
              quantityCount: parseInt(item.qty, 10),
              quantityKg: (parseInt(item.qty, 10) * unitWeight).toFixed(3)
            };
          })
        }
      },
      include: { items: true }
    });

    res.status(200).json({
      success: true,
      transfer: { id: transferOrder.id, transferRef: transferOrder.transferRef }
    });
  } catch (error) {
    console.error("Plan Error:", error);
    res.status(500).json({ success: false, message: "Failed to plan transfer: " + error.message });
  }
};

// ==========================================
// FOR SALES/CHECKOUT PAGE (Dev Override)
// ==========================================
export const getProductsWithWarehouseStock = async (req, res) => {
  try {
    const userGodownId = req.query.godownId || req.user?.godownId;

    // Fetch all products with variants
    const products = await prisma.product.findMany({
      include: {
        productVariants: {
          include: {
            inventoryBalances: {
              include: {
                bin: {
                  include: {
                    shelf: {
                      include: {
                        rack: {
                          include: {
                            aisle: {
                              include: {
                                room: {
                                  include: { zone: { include: { godown: true } } }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                batch: true
              }
            }
          }
        }
      }
    });

    // Format and calculate total stock per variant, prioritizing the user's warehouse
    const formattedProducts = products.map(product => {
      return {
        id: product.id,
        name: product.name,
        variants: product.productVariants.map(variant => {
          // Calculate stock breakdown across warehouses
          const warehouseStockMap = {};
          let totalAvailable = 0;

          variant.inventoryBalances.forEach(balance => {
            const godown = balance.bin?.shelf?.rack?.aisle?.room?.zone?.godown;
            if (!godown) return;

            // ==========================================
            // DEV OVERRIDE: Ignore allocated (locked) stock.
            // Just use the raw physical count so it perfectly matches the Ledger.
            // ==========================================
            const availableInBin = balance.currentCount;

            if (availableInBin <= 0) return;

            totalAvailable += availableInBin;

            if (!warehouseStockMap[godown.id]) {
              warehouseStockMap[godown.id] = {
                godownId: godown.id,
                godownName: godown.name,
                availableQty: 0
              };
            }
            warehouseStockMap[godown.id].availableQty += availableInBin;
          });

          // Convert map to array and sort: user's default warehouse first
          let warehouses = Object.values(warehouseStockMap);
          if (userGodownId) {
            warehouses.sort((a, b) => {
              if (a.godownId === userGodownId) return -1;
              if (b.godownId === userGodownId) return 1;
              return 0;
            });
          }

          return {
            id: variant.id,
            sku: variant.sku,
            price: variant.price,
            attributes: variant.attributes,
            totalAvailable,
            warehouses // Ordered with user's default warehouse at index 0
          };
        })
      };
    });

    res.json({ success: true, data: formattedProducts });
  } catch (error) {
    console.error("Products Stock Fetch Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// PHASE 2: EXECUTE & WRITE TO DOUBLE-ENTRY LEDGER (Per-item batch validation)
export const executePlannedTransfer = async (req, res) => {
  const { transferId } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      const transfer = await tx.internalTransfer.findUnique({
        where: { id: transferId },
        include: { items: true }
      });

      if (!transfer) throw new Error("Transfer record not found.");
      if (transfer.notes && transfer.notes.includes("[STATUS: COMPLETED]")) {
        throw new Error("Idempotency Guard: This transfer has already been executed.");
      }

      for (const item of transfer.items) {
        if (!item.batchId) {
          throw new Error(`Batch ID missing for item variant ${item.productVariantId}.`);
        }

        const sourceStock = await tx.inventoryBalance.findUnique({
          where: {
            productVariantId_binId_batchId: {
              productVariantId: item.productVariantId,
              binId: item.sourceBinId,
              batchId: item.batchId // Pulled from the item record directly
            }
          }
        });

        if (!sourceStock || sourceStock.currentCount < item.quantityCount) {
          throw new Error(`Insufficient stock for variant in source bin for batch ${item.batchId}.`);
        }

        await tx.inventoryBalance.update({
          where: { id: sourceStock.id },
          data: { currentCount: { decrement: item.quantityCount } }
        });

        await tx.inventoryBalance.upsert({
          where: {
            productVariantId_binId_batchId: {
              productVariantId: item.productVariantId,
              binId: item.destinationBinId,
              batchId: item.batchId
            }
          },
          update: { currentCount: { increment: item.quantityCount } },
          create: {
            productVariantId: item.productVariantId,
            binId: item.destinationBinId,
            batchId: item.batchId,
            currentCount: item.quantityCount,
            allocatedCount: 0
          }
        });

        await tx.stockLedger.create({
          data: {
            productVariantId: item.productVariantId,
            sourceBinId: item.sourceBinId,
            destinationBinId: item.destinationBinId,
            quantityCount: item.quantityCount,
            quantityKg: item.quantityKg,
            type: 'INTERNAL_TRANSFER',
            reference: transfer.transferRef,
            notes: `Executed via planned workflow entry (Batch: ${item.batchId}).`
          }
        });
      }

      const updatedNotes = transfer.notes
          ? transfer.notes.replace("[STATUS: PLANNED]", "[STATUS: COMPLETED]")
          : "[STATUS: COMPLETED]";

      await tx.internalTransfer.update({
        where: { id: transfer.id },
        data: { notes: updatedNotes }
      });
    });

    res.status(200).json({ success: true, message: "Transfer completed successfully." });
  } catch (error) {
    console.error("Transfer Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStockBalances = async (req, res) => {
  try {
    const { godownId } = req.query;

    const balances = await prisma.inventoryBalance.findMany({
      where: {
        currentCount: { gt: 0 }
      },
      include: {
        productVariant: {
          include: { product: { select: { name: true } } }
        },
        bin: {
          select: {
            id: true,
            name: true,
            godownId: true
          }
        }
      }
    });

    // Map + optional godown filter
    let rows = balances.map((b) => {
      const available = Number(b.currentCount || 0) - Number(b.allocatedCount || 0);
      return {
        id: b.id,
        productVariantId: b.productVariantId,
        batchId: b.batchId,
        binId: b.binId,
        godownId: b.bin?.godownId || null,
        godownName: null, // filled below if needed
        sku: b.productVariant?.sku || '',
        productName:
            b.productVariant?.name ||
            b.productVariant?.product?.name ||
            '',
        currentCount: Number(b.currentCount || 0),
        allocatedCount: Number(b.allocatedCount || 0),
        availableQty: available > 0 ? available : 0,
        quantity: available > 0 ? available : 0
      };
    });

    if (godownId) {
      rows = rows.filter((r) => String(r.godownId) === String(godownId));
    }

    // Resolve godown names in one query
    const godownIds = [...new Set(rows.map((r) => r.godownId).filter(Boolean))];
    if (godownIds.length) {
      const godowns = await prisma.godown.findMany({
        where: { id: { in: godownIds } },
        select: { id: true, name: true }
      });
      const nameMap = Object.fromEntries(godowns.map((g) => [g.id, g.name]));
      rows = rows.map((r) => ({
        ...r,
        godownName: nameMap[r.godownId] || null
      }));
    }

    const totalQuantity = rows.reduce((s, r) => s + (Number(r.availableQty) || 0), 0);

    return res.json({
      success: true,
      totalQuantity,
      data: rows
    });
  } catch (error) {
    console.error('getStockBalances error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};