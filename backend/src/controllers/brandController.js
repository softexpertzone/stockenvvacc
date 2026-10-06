import prisma from '../config/db.js';
import catalogService from '../services/catalogService.js';

// 1. Create a node (Category, Brand, or Model)
export const createBrand = async (req, res) => {
  try {
    // Call the service we fixed earlier
    const brand = await catalogService.createBrand(req.body);
    res.status(201).json({ data: brand, success: true });
  } catch (error) {
    // LOG THE ACTUAL ERROR TO THE TERMINAL
    console.error("❌ BACKEND ERROR IN CREATE BRAND:", error);

    // Send the real message to the frontend, not the generic "Could not create node"
    res.status(400).json({ message: error.message });
  }
};

// 2. Fetch children for a specific parent
export const getSubBrands = async (req, res) => {
  const { parentId } = req.params;
  try {
    const children = await prisma.brand.findMany({
      where: { parentId: parentId === 'null' ? null : parentId },
      orderBy: { name: 'asc' },
      include: { subBrands: true } // Added to enable recursive UI rendering
    });
    res.json(children);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hierarchy children" });
  }
};

// 3. Fetch the entire tree (Flat list for UI processing)
export const getAllBrandsAndModels = async (req, res) => {
  try {
    const allNodes = await prisma.brand.findMany({
      orderBy: { createdAt: 'asc' }
    });
    // Wrap in { data: ... } so your frontend 'res?.data' logic works
    res.json({ data: allNodes });
  } catch (error) {
    console.error("❌ FETCH ALL ERROR:", error.stack);
    res.status(500).json({ error: "Failed to fetch full hierarchy" });
  }
};

// 4. Delete a node
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    // Prisma will throw an error if the node has children
    // due to foreign key constraints if set correctly in your DB.
    await prisma.brand.delete({ where: { id } });
    res.status(200).json({ message: "Node deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: "Cannot delete: This node may have sub-items attached." });
  }
};