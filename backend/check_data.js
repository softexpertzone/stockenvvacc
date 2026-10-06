const prisma = require('./src/lib/prisma');

async function checkOrphans() {
    console.log("--- Checking Inventory Balance Integrity ---");
    const data = await prisma.inventoryBalance.findMany({
        include: {
            productVariant: { include: { product: true } },
            rack: { include: { room: { include: { godown: true } } } }
        }
    });

    data.forEach(item => {
        const prod = item.productVariant?.product?.name || "MISSING_PRODUCT";
        const godown = item.rack?.room?.godown?.name || "MISSING_GODOWN";
        console.log(`ID: ${item.id} | Product: ${prod} | Godown: ${godown} | Qty: ${item.currentCount}`);
    });
}

checkOrphans();