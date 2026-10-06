import prisma from '../lib/prisma.js';
import inventoryService from '../services/inventoryService.js';
import putAwayEngine from '../utils/putAwayEngine.js';
import stockService from '../services/stockService.js';
import { aggregateCapacityUpwards } from '../utils/capacityAggregator.js';

// Helper function to safely parse and convert values to standard floats
const parseMetric = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  return parseFloat(val);
};

export const getWarehouseHierarchy = async (req, res) => {
  try {
    const [godowns, zones, rooms, aisles, racks, shelves] = await Promise.all([
      prisma.godown.findMany(),
      prisma.zone.findMany(),
      prisma.room.findMany(),
      prisma.aisle.findMany(),
      prisma.rack.findMany(),
      prisma.shelf.findMany(),
    ]);
    res.json({ godowns, zones, rooms, aisles, racks, shelves });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load hierarchy' });
  }
};

export const handleUnifiedSetup = async (req, res) => {
  const {
    tier, name, godownId, zoneId, roomId,
    aisleId, rackId, shelfId, maxWeightKg,
    maxVolumeCm3, storageClass
  } = req.body;

  try {
    let result;
    // Safely transform incoming metric strings to numeric floats
    const parsedWeight = parseMetric(maxWeightKg);
    const parsedVolume = parseMetric(maxVolumeCm3);

    switch (tier) {
      case 'godown':
        result = await prisma.godown.create({ data: { name } });
        break;
      case 'zone':
        result = await prisma.zone.create({ data: { name, godownId } });
        break;
      case 'room':
        result = await prisma.room.create({ data: { name, zoneId } });
        break;
      case 'aisle':
        result = await prisma.aisle.create({ data: { name, roomId } });
        break;
      case 'rack':
        result = await prisma.rack.create({
          data: {
            name,
            aisleId,
            maxWeightKg: parsedWeight || 0,
            maxVolumeCm3: parsedVolume || 0
          }
        });
        break;
      case 'shelf':
        result = await prisma.shelf.create({
          data: {
            name,
            rackId,
            maxWeightKg: parsedWeight || 0,
            maxVolumeCm3: parsedVolume || 0
          }
        });
        break;
      case 'bin': {
        // 1. Validation Check: name, shelfId, and godownId are mandatory in your schema
        if (!name || !shelfId || !godownId) {
          return res.status(400).json({
            message: "Missing required fields. 'name', 'shelfId', and 'godownId' are all required to create a Bin."
          });
        }

        // 2. Safely fall back to 0 if metrics parsed from parseMetric() are NaN, null, or undefined
        const finalWeight = (typeof parsedWeight === 'number' && !isNaN(parsedWeight)) ? parsedWeight : 0;
        const finalVolume = (typeof parsedVolume === 'number' && !isNaN(parsedVolume)) ? parsedVolume : 0;

        // 3. Create the Bin with the required relationship mappings
        result = await prisma.bin.create({
          data: {
            name,
            shelfId,
            godownId, // This performance shortcut field is required by your Prisma schema!
            maxWeightKg: finalWeight,
            maxVolumeCm3: finalVolume,
            storageClass: storageClass || 'GENERAL'
          }
        });
        break;
      }
      default:
        return res.status(400).json({ message: "Invalid tier" });
    }
    res.status(201).json(result);
  } catch (error) {
    // Log the entire error object on the server to catch schema mismatches instantly
    console.error("DATABASE ERROR IN UNIFIED SETUP:", error);

    res.status(500).json({
      message: error.message,
      meta: error.meta // Exposes useful Prisma details to the frontend/network logs
    });
  }
};

// ==========================================
// 1. GODOWN MANAGEMENT
// ==========================================
export const addGodown = async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name is required." });
    const godown = await prisma.godown.create({ data: { name, address } });
    res.status(201).json({ success: true, data: godown });
  } catch (error) {
    res.status(400).json({ success: false, error: "Could not create Godown." });
  }
};

export const getGodowns = async (req, res) => {
  try {
    const data = await prisma.godown.findMany({
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
                            bins: true
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
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateGodown = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const godown = await prisma.godown.update({ where: { id }, data: { name, address } });
    res.json({ success: true, data: godown });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteGodown = async (req, res) => {
  try {
    await prisma.godown.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Godown deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: "Cannot delete Godown containing active zones." });
  }
};

export const moveStock = async (req, res) => {
  try {
    const result = await stockService.executeStockMove(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==========================================
// 2. ZONE MANAGEMENT
// ==========================================
export const addZone = async (req, res) => {
  try {
    const { name, godownId } = req.body;
    const zone = await prisma.zone.create({ data: { name, godownId } });
    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const zone = await prisma.zone.update({ where: { id }, data: { name } });
    res.json({ success: true, data: zone });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteZone = async (req, res) => {
  try {
    await prisma.zone.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Zone deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: "Cannot delete Zone containing active rooms." });
  }
};

// ==========================================
// 3. ROOM MANAGEMENT
// ==========================================
export const addRoom = async (req, res) => {
  try {
    const { name, zoneId } = req.body;
    const room = await prisma.room.create({ data: { name, zoneId } });
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const room = await prisma.room.update({ where: { id }, data: { name } });
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    await prisma.room.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Room deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: "Cannot delete Room containing active aisles." });
  }
};

// ==========================================
// 4. AISLE MANAGEMENT
// ==========================================
export const addAisle = async (req, res) => {
  try {
    const { name, roomId } = req.body;
    const aisle = await prisma.aisle.create({ data: { name, roomId } });
    res.status(201).json({ success: true, data: aisle });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateAisle = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const aisle = await prisma.aisle.update({ where: { id }, data: { name } });
    res.json({ success: true, data: aisle });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteAisle = async (req, res) => {
  try {
    await prisma.aisle.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Aisle deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: "Cannot delete Aisle containing active racks." });
  }
};

// ==========================================
// 5. RACK MANAGEMENT
// ==========================================
export const addRack = async (req, res) => {
  try {
    const { name, aisleId, maxWeightKg, maxVolumeCm3 } = req.body;
    const rack = await prisma.rack.create({
      data: {
        name,
        aisleId,
        maxWeightKg: parseMetric(maxWeightKg),
        maxVolumeCm3: parseMetric(maxVolumeCm3)
      }
    });
    res.status(201).json({ success: true, data: rack });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateRack = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, maxWeightKg, maxVolumeCm3 } = req.body;
    const rack = await prisma.rack.update({
      where: { id },
      data: {
        name,
        maxWeightKg: parseMetric(maxWeightKg),
        maxVolumeCm3: parseMetric(maxVolumeCm3)
      }
    });
    res.json({ success: true, data: rack });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteRack = async (req, res) => {
  try {
    await prisma.rack.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Rack deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: "Cannot delete Rack containing active shelves." });
  }
};

// ==========================================
// 6. SHELF MANAGEMENT
// ==========================================
export const addShelf = async (req, res) => {
  try {
    const { name, rackId, maxWeightKg, maxVolumeCm3 } = req.body;
    const shelf = await prisma.shelf.create({
      data: {
        name,
        rackId,
        maxWeightKg: parseMetric(maxWeightKg),
        maxVolumeCm3: parseMetric(maxVolumeCm3)
      }
    });
    res.status(201).json({ success: true, data: shelf });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateShelf = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, maxWeightKg, maxVolumeCm3 } = req.body;
    const shelf = await prisma.shelf.update({
      where: { id },
      data: {
        name,
        maxWeightKg: parseMetric(maxWeightKg),
        maxVolumeCm3: parseMetric(maxVolumeCm3)
      }
    });
    res.json({ success: true, data: shelf });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteShelf = async (req, res) => {
  try {
    await prisma.shelf.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Shelf deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: "Cannot delete Shelf containing active bins." });
  }
};

// ==========================================
// 7. BIN MANAGEMENT
// ==========================================
export const addBin = async (req, res) => {
  try {
    const { name, shelfId, maxWeightKg, maxVolumeCm3, storageClass } = req.body;
    const bin = await prisma.bin.create({
      data: {
        name,
        shelfId,
        maxWeightKg: parseMetric(maxWeightKg),
        maxVolumeCm3: parseMetric(maxVolumeCm3),
        storageClass: storageClass || 'GENERAL'
      }
    });
    res.status(201).json({ success: true, data: bin });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateBin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, maxWeightKg, maxVolumeCm3, storageClass } = req.body;
    const bin = await prisma.bin.update({
      where: { id },
      data: {
        name,
        maxWeightKg: parseMetric(maxWeightKg),
        maxVolumeCm3: parseMetric(maxVolumeCm3),
        storageClass
      }
    });
    res.json({ success: true, data: bin });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteBin = async (req, res) => {
  try {
    await prisma.bin.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Bin deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: "Cannot delete Bin that currently holds inventory." });
  }
};

export const getRoomsByGodown = async (req, res) => {
  try {
    const { godownId } = req.params;

    const rooms = await prisma.room.findMany({
      where: {
        zone: {
          godownId: godownId
        }
      }
    });

    // Return standard JSON matching your frontend expectations
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error fetching rooms by godown:", error);
    res.status(500).json({ error: error.message });
  }
};

// Fetches all Racks inside a Room (by searching through Aisles)
export const getRacksByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const racks = await prisma.rack.findMany({
      where: {
        aisle: {
          roomId: roomId
        }
      }
    });

    // Return standard JSON matching your frontend expectations
    res.status(200).json(racks);
  } catch (error) {
    console.error("Error fetching racks by room:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getBinsByRack = async (req, res, next) => {
  try {
    const { rackId } = req.params;

    const bins = await prisma.bin.findMany({
      where: {
        isActive: true,
        shelf: {
          rackId: rackId,
        },
      },
      select: {
        id: true,
        name: true,
        shelfId: true,
        shelf: {
          select: {
            id: true,
            name: true,
            rackId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: bins });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. SMART PLACEMENT & INVENTORY WRAPPERS
// ==========================================
export const getDetailedInventory = async (req, res) => {
  try {
    const data = await inventoryService.getAllInventory();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// NEW: Fetches mapped stock levels for the Stock Balances table
export const getStockLevels = async (req, res) => {
  try {
    // Queries the exact table populated by `commitPutAway`
    const balances = await prisma.inventoryBalance.findMany({
      include: {
        productVariant: {
          include: { product: true }
        },
        batch: true,
        bin: {
          include: {
            godown: true, // Included based on unifiedSetup schema
            shelf: {
              include: {
                rack: {
                  include: {
                    aisle: {
                      include: {
                        room: true
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

    // Map Prisma schema structure to exactly what the frontend anticipates
    const formattedData = balances.map(item => {
      const variant = item.productVariant;
      const product = variant?.product;

      const godownName = item.bin?.godown?.name || null;
      const roomName = item.bin?.shelf?.rack?.aisle?.room?.name || null;
      const rackName = item.bin?.shelf?.rack?.name || null;
      const binName = item.bin?.name || null;

      // Construct a clean path string
      const pathParts = [godownName, roomName, rackName, binName].filter(Boolean);
      const binPath = pathParts.length > 0 ? pathParts.join(' ➔ ') : null;

      return {
        id: item.id,
        productName: product?.name || variant?.name || 'Unnamed Product',
        sku: variant?.sku || product?.sku || '—',
        quantity: item.currentCount || 0,
        batchNumber: item.batch?.batchNumber || '—',
        godownName,
        roomName,
        rackName,
        binName,
        binPath
      };
    });

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error fetching stock levels:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const suggestBin = async (req, res) => {
  const { variantId, quantity, godownId, warehouseId } = req.body;
  const targetGodownId = godownId || warehouseId;

  console.log("DEBUG: Incoming request for variantId:", variantId, "in godown:", targetGodownId);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const bestBin = await putAwayEngine.findBestBin(tx, { variantId, quantity, godownId: targetGodownId });
      if (!bestBin) throw new Error("No bin available with sufficient capacity.");
      return bestBin;
    });

    res.status(200).json({ success: true, bin: result });
  } catch (error) {
    console.error("Bin Suggestion Error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==========================================
// 9. RESERVE-TO-COMMIT WORKFLOW
// ==========================================
export const commitPutAway = async (req, res) => {
  // 1. ADDED: Destructure poNumber and grnNumber from the incoming request
  const { variantId, binId, quantity, batchNumber, poNumber, grnNumber } = req.body;

  if (!variantId || !binId || !quantity) {
    return res.status(400).json({ success: false, error: "Missing required placement fields." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true }
      });
      if (!variant) throw new Error("Variant not found.");

      const qty = parseFloat(quantity);
      const addedWeight = parseFloat(variant.weightKg || 0) * qty;

      const length = parseFloat(variant.lengthCm || 0);
      const width = parseFloat(variant.widthCm || 0);
      const height = parseFloat(variant.heightCm || 0);
      const addedVolume = (parseFloat(variant.volumeCm3) || (length * width * height)) * qty;

      let batch = null;
      if (batchNumber) {
        batch = await tx.batch.upsert({
          where: { batchNumber },
          update: {},
          create: { batchNumber, productVariantId: variantId }
        });
      }

      const inventory = await tx.inventoryBalance.upsert({
        where: {
          productVariantId_binId_batchId: {
            productVariantId: variantId,
            binId: binId,
            batchId: batch ? batch.id : ""
          }
        },
        update: {
          currentCount: { increment: qty }
        },
        create: {
          productVariantId: variantId,
          binId: binId,
          batchId: batch ? batch.id : "",
          currentCount: qty
        }
      });

      const updatedBin = await tx.bin.update({
        where: { id: binId },
        data: {
          currentWeight: { increment: addedWeight },
          currentVolume: { increment: addedVolume }
        }
      });

      await aggregateCapacityUpwards(tx, updatedBin.shelfId);

      // 2. ADDED: Prioritize saving PO or GRN as the ledger reference
      const referenceId = poNumber || grnNumber || batchNumber || 'PUTAWAY-COMMIT';

      await tx.stockLedger.create({
        data: {
          productVariantId: variantId,
          destinationBinId: binId,
          quantityCount: qty,
          type: 'ADJUSTMENT',
          reference: referenceId, // Saves PO-2026-001 here
          notes: `PO/GRN: ${referenceId} | Confirmed Put-away placement in ${updatedBin.name}`
        }
      });

      return { inventory, updatedBin };
    });

    res.status(200).json({
      success: true,
      message: "Put-away successfully committed and warehouse capacities updated.",
      data: result
    });
  } catch (error) {
    console.error("Putaway Commit Error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==========================================
// 10. PURCHASE ORDER & GRN TRACEABILITY
// ==========================================
export const searchByPurchaseOrder = async (req, res) => {
  try {
    const { poNumber } = req.params;

    if (!poNumber) {
      return res.status(400).json({ success: false, error: "Purchase Order, GRN, or Batch number is required." });
    }

    // 1. Search ledger by PO/GRN reference OR notes OR batch number
    const ledgerRecords = await prisma.stockLedger.findMany({
      where: {
        OR: [
          { reference: { contains: poNumber, mode: 'insensitive' } },
          { notes: { contains: poNumber, mode: 'insensitive' } },
          {
            productVariant: {
              batches: {
                some: {
                  batchNumber: { contains: poNumber, mode: 'insensitive' }
                }
              }
            }
          }
        ]
      },
      include: {
        productVariant: {
          include: { product: true }
        },
        destinationBin: {
          include: {
            godown: true,
            shelf: {
              include: {
                rack: {
                  include: {
                    aisle: {
                      include: { room: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!ledgerRecords || ledgerRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No inventory records found matching PO/GRN/Batch reference: "${poNumber}"`
      });
    }

    // 2. Fetch current live balances for found products
    const variantIds = [...new Set(ledgerRecords.map(r => r.productVariantId))];

    const currentBalances = await prisma.inventoryBalance.findMany({
      where: {
        productVariantId: { in: variantIds }
      },
      include: {
        batch: true,
        bin: {
          include: {
            godown: true,
            shelf: {
              include: {
                rack: {
                  include: {
                    aisle: {
                      include: { room: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // 3. Format response for Purchase Returns & Location Tracking
    const searchResults = ledgerRecords.map(record => {
      const variant = record.productVariant;
      const product = variant?.product;

      const liveBalance = currentBalances.find(b => b.productVariantId === record.productVariantId);
      const targetBin = liveBalance?.bin || record.destinationBin;

      const godown = targetBin?.godown?.name || null;
      const room = targetBin?.shelf?.rack?.aisle?.room?.name || null;
      const rack = targetBin?.shelf?.rack?.name || null;
      const bin = targetBin?.name || null;

      const locationPath = [godown, room, rack, bin].filter(Boolean).join(' ➔ ');

      return {
        ledgerId: record.id,
        poNumber: record.reference,
        productName: product?.name || variant?.name || 'Unnamed Product',
        sku: variant?.sku || product?.sku || '—',
        batchNumber: liveBalance?.batch?.batchNumber || '—',
        receivedQuantity: record.quantityCount,
        currentBinQuantity: liveBalance?.currentCount || 0,
        variantId: record.productVariantId,
        binId: targetBin?.id || null,
        batchId: liveBalance?.batchId || null,
        locationPath: locationPath || 'Floating Stock (Unallocated)',
        transactionDate: record.createdAt
      };
    });

    res.status(200).json({
      success: true,
      query: poNumber,
      totalItemsFound: searchResults.length,
      data: searchResults
    });

  } catch (error) {
    console.error("Error tracing Purchase Order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};