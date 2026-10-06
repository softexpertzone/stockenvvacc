import prisma from '../lib/prisma.js';

// ==========================================
// PUT-AWAY RULES MANAGEMENT
// ==========================================

export const addRule = async (req, res) => {
    try {
        const { categoryId, binId, priority, isActive } = req.body;

        if (!categoryId || !binId) {
            return res.status(400).json({ success: false, error: "categoryId and binId are required." });
        }

        const rule = await prisma.putAwayRule.create({
            data: {
                categoryId,
                binId,
                priority: priority ? parseInt(priority) : 0,
                isActive: isActive !== undefined ? isActive : true
            }
        });
        res.status(201).json({ success: true, data: rule });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const getRules = async (req, res) => {
    try {
        const rules = await prisma.putAwayRule.findMany({
            include: {
                bin: true,
                category: true // Assuming you have a relation setup for category in Prisma
            },
            orderBy: {
                priority: 'desc'
            }
        });
        res.status(200).json({ success: true, data: rules });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateRule = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryId, binId, priority, isActive } = req.body;

        const rule = await prisma.putAwayRule.update({
            where: { id },
            data: { categoryId, binId, priority, isActive }
        });
        res.json({ success: true, data: rule });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const deleteRule = async (req, res) => {
    try {
        await prisma.putAwayRule.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: "Rule deleted successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};