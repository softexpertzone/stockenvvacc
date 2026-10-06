import prisma from './lib/prisma.js';

async function verifyInventoryAccountsSync() {
    console.log('\n======================================================');
    console.log('🔍 INVENTORY & ACCOUNTS RECONCILIATION AUDIT');
    console.log('======================================================\n');

    try {
        // 1. Fetch physical inventory balances with variant & product info
        const balances = await prisma.inventoryBalance.findMany({
            include: {
                productVariant: {
                    include: {
                        product: true
                    }
                }
            }
        });

        let physicalValuation = 0;
        console.log('--- 📦 ITEM-BY-ITEM PHYSICAL STOCK VALUATION ---');

        for (const b of balances) {
            const qty = Number(b.currentCount || 0);
            const cost = Number(b.productVariant ? (b.productVariant.purchasePrice || 0) : 0);
            const lineValuation = qty * cost;
            physicalValuation += lineValuation;

            if (qty > 0 || lineValuation > 0) {
                const productName = (b.productVariant && b.productVariant.product) ? b.productVariant.product.name : 'Unknown Item';
                const sku = (b.productVariant && b.productVariant.sku) ? b.productVariant.sku : 'N/A';
                const label = String(productName + ' (' + sku + ')').padEnd(42);
                const formattedQty = String(qty).padStart(6);
                const formattedCost = cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(10);
                const formattedTotal = lineValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                console.log('• Item: ' + label + ' | Qty: ' + formattedQty + ' | Unit Cost: $' + formattedCost + ' | Total: $' + formattedTotal);
            }
        }

        console.log('------------------------------------------------------');
        console.log('📦 Calculated Physical Stock Valuation : $' + physicalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

        // 2. Query Financial General Ledger "Inventory" ledger balance
        const inventoryLedger = await prisma.accountLedger.findFirst({
            where: {
                name: { equals: 'Inventory', mode: 'insensitive' }
            }
        });

        if (!inventoryLedger) {
            console.log('❌ Error: "Inventory" ledger not found in accountLedger table.');
            return;
        }

        const entries = await prisma.voucherEntry.aggregate({
            where: {
                ledgerId: inventoryLedger.id,
                voucher: { status: 'POSTED' }
            },
            _sum: { debit: true, credit: true }
        });

        const totalDebit = Number((entries._sum && entries._sum.debit) || 0);
        const totalCredit = Number((entries._sum && entries._sum.credit) || 0);
        const accountsValuation = totalDebit - totalCredit;

        const diff = physicalValuation - accountsValuation;

        console.log('📑 General Ledger "Inventory" Balance : $' + accountsValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        console.log('------------------------------------------------------');
        console.log('⚖️ Variance                           : $' + diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\n');

        if (Math.abs(diff) < 0.01) {
            console.log('✅ PERFECT SYNC: Physical Inventory Valuation matches General Ledger exactly!');
        } else {
            console.log('⚠️ MISMATCH DETECTED: Physical stock valuation and General Ledger are out of sync.');
        }

    } catch (error) {
        console.error('❌ Audit execution error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyInventoryAccountsSync();