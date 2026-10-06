const prisma = require('./src/lib/prisma');

async function fixLinkage() {
    // 1. Get the Godown and its rooms
    const godown = await prisma.godown.findUnique({
        where: { id: "f62da929-697e-45b8-8191-4cf35075ce8a" },
        include: { rooms: true }
    });

    console.log(`Fixing links for: ${godown.name}`);

    // 2. Map all rooms in this godown
    const roomIds = godown.rooms.map(r => r.id);

    // 3. Re-verify racks are connected to these rooms
    const racks = await prisma.rack.findMany({
        where: { roomId: { in: roomIds } }
    });

    console.log(`Verified ${racks.length} racks connected to Godown 1.`);
}
fixLinkage();