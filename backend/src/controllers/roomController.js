// E:\stockinventory\backend-erp\src\controllers\roomController.js
const prisma = require('../lib/prisma');

exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
            include: {
                godown: {
                    select: { name: true } // Only fetch the name to keep the payload light
                }
            },
            orderBy: {
                godown: { name: 'asc' } // Sort by Godown name for better UX
            }
        });

        res.status(200).json({ success: true, data: rooms });
    } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ success: false, message: "Could not fetch rooms." });
    }
};