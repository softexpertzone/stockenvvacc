export const findBestBin = async (tx, { variantId, quantity = 1, godownId }) => {
    // --- DEBUG BLOCK ---
    console.log("DEBUG: Engine received ID:", variantId);
    console.log("DEBUG: Engine received type:", typeof variantId);
    // ----------------------------

    // 1. Validation
    if (!godownId) throw new Error("Put-Away Engine: No godownId provided.");
    if (!variantId) throw new Error("Put-Away Engine: No variantId provided.");

    // 2. Resolve Variant (The Smart Fallback Fix)
    // First, try to find it assuming the ID is correctly a ProductVariant
    let variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true }
    });

    // Fallback: If not found, the frontend likely sent a Product ID instead!
    if (!variant) {
        console.log("DEBUG: Variant not found. Attempting to look up parent Product instead...");
        const parentProduct = await tx.product.findUnique({
            where: { id: variantId },
            // CRITICAL FIX: Use 'productVariants' to match your Prisma schema
            include: { productVariants: true }
        });

        // If it's a product, grab its first associated variant
        if (parentProduct && parentProduct.productVariants?.length > 0) {
            variant = parentProduct.productVariants[0];
            console.log("DEBUG: Successfully resolved to Variant ID:", variant.id);
        }
    }

    // If it still fails, the ID doesn't exist in the database at all.
    if (!variant) throw new Error(`Product variant (or parent product) not found for ID: ${variantId}`);

    // 3. Weight & Volume Calculations (Safe Number Parsing)
    const numQty = Number(quantity) || 1;
    const incomingWeight = numQty * Number(variant.weightKg || 0);
    const incomingVolume = numQty * Number(variant.volumeCm3 || 0);

    // 4. Capacity Validator (Strict Godown Check)
    const canFit = (bin) => {
        if (bin.godownId !== godownId) return false; // Fail if warehouse mismatch

        const remW = Number(bin.maxWeightKg || 0) - Number(bin.currentWeight || 0);
        const remV = Number(bin.maxVolumeCm3 || 0) - Number(bin.currentVolume || 0);

        const weightOk = Number(bin.maxWeightKg) === 0 || remW >= incomingWeight;
        const volumeOk = Number(bin.maxVolumeCm3) === 0 || remV >= incomingVolume;

        return weightOk && volumeOk;
    };

    // 5. Strategy 1: Rules
    if (variant.product?.categoryId) {
        const rules = await tx.putAwayRule.findMany({
            where: { isActive: true, categoryId: variant.product.categoryId, bin: { godownId } },
            orderBy: { priority: "desc" },
            include: { bin: true }
        });
        for (const rule of rules) if (rule.bin && canFit(rule.bin)) return rule.bin;
    }

    // 6. Strategy 2: Consolidation
    const existing = await tx.inventoryBalance.findMany({
        where: { productVariantId: variant.id, bin: { isActive: true, godownId } },
        include: { bin: true },
        orderBy: { currentCount: 'desc' }
    });
    for (const bal of existing) if (bal.bin && canFit(bal.bin)) return bal.bin;

    // 7. Strategy 3: Proximity / Best Fit
    const bins = await tx.bin.findMany({ where: { isActive: true, godownId } });
    const bestBin = bins.filter(b => canFit(b)).sort((a, b) => {
        const remA = Number(a.maxWeightKg) === 0 ? Infinity : (Number(a.maxWeightKg) - Number(a.currentWeight));
        const remB = Number(b.maxWeightKg) === 0 ? Infinity : (Number(b.maxWeightKg) - Number(b.currentWeight));
        return remA - remB;
    })[0];

    // Debugging trace
    if (!bestBin) {
        console.error("ENGINE ERROR: No suitable bin found for:", { godownId, resolvedVariantId: variant.id });
    }

    return bestBin || null;
};

export default { findBestBin };