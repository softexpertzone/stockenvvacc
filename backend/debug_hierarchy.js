const prisma = require('./src/lib/prisma');

async function checkHierarchy() {
    console.log("--- Fetching Godown Structure ---");
    const data = await prisma.godown.findMany({
        include: {
            rooms: {
                include: {
                    racks: true
                }
            }
        }
    });

    data.forEach(g => {
        console.log(`Godown: ${g.name} (ID: ${g.id})`);
        g.rooms.forEach(r => {
            console.log(`  Room: ${r.name} (ID: ${r.id})`);
            if (r.racks.length === 0) console.log(`    -> NO RACKS IN THIS ROOM`);
            r.racks.forEach(rack => {
                console.log(`    -> Rack: ${rack.name} (ID: ${rack.id})`);
            });
        });
    });

    if (data.length === 0) console.log("ERROR: No Godowns found in database!");
}

checkHierarchy();