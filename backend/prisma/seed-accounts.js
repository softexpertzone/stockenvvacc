import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding Account Groups & Ledgers...');

    // ======================
    // 1. PRIMARY GROUPS
    // ======================
    const assets = await prisma.accountGroup.upsert({
        where: { code: 'AST' },
        update: {},
        create: {
            name: 'Assets',
            code: 'AST',
            nature: 'ASSETS',
            type: 'PRIMARY',
            sortOrder: 1,
        },
    });

    const liabilities = await prisma.accountGroup.upsert({
        where: { code: 'LIA' },
        update: {},
        create: {
            name: 'Liabilities',
            code: 'LIA',
            nature: 'LIABILITIES',
            type: 'PRIMARY',
            sortOrder: 2,
        },
    });

    const income = await prisma.accountGroup.upsert({
        where: { code: 'INC' },
        update: {},
        create: {
            name: 'Income',
            code: 'INC',
            nature: 'INCOME',
            type: 'PRIMARY',
            sortOrder: 3,
        },
    });

    const expenses = await prisma.accountGroup.upsert({
        where: { code: 'EXP' },
        update: {},
        create: {
            name: 'Expenses',
            code: 'EXP',
            nature: 'EXPENSES',
            type: 'PRIMARY',
            sortOrder: 4,
        },
    });

    const equity = await prisma.accountGroup.upsert({
        where: { code: 'EQU' },
        update: {},
        create: {
            name: 'Equity',
            code: 'EQU',
            nature: 'EQUITY',
            type: 'PRIMARY',
            sortOrder: 5,
        },
    });

    // ======================
    // 2. SECONDARY GROUPS
    // ======================
    const currentAssets = await prisma.accountGroup.upsert({
        where: { code: 'CA' },
        update: {},
        create: {
            name: 'Current Assets',
            code: 'CA',
            nature: 'ASSETS',
            type: 'SECONDARY',
            parentId: assets.id,
            sortOrder: 1,
        },
    });

    const cashBankGroup = await prisma.accountGroup.upsert({
        where: { code: 'CASHBANK' },
        update: {},
        create: {
            name: 'Cash & Bank',
            code: 'CASHBANK',
            nature: 'ASSETS',
            type: 'SECONDARY',
            parentId: currentAssets.id,
            sortOrder: 1,
        },
    });

    const inventoryGroup = await prisma.accountGroup.upsert({
        where: { code: 'INVGRP' },
        update: {},
        create: {
            name: 'Inventory',
            code: 'INVGRP',
            nature: 'ASSETS',
            type: 'SECONDARY',
            parentId: currentAssets.id,
            sortOrder: 2,
        },
    });

    const arGroup = await prisma.accountGroup.upsert({
        where: { code: 'ARGRP' },
        update: {},
        create: {
            name: 'Accounts Receivable',
            code: 'ARGRP',
            nature: 'ASSETS',
            type: 'SECONDARY',
            parentId: currentAssets.id,
            sortOrder: 3,
        },
    });

    const currentLiabilities = await prisma.accountGroup.upsert({
        where: { code: 'CL' },
        update: {},
        create: {
            name: 'Current Liabilities',
            code: 'CL',
            nature: 'LIABILITIES',
            type: 'SECONDARY',
            parentId: liabilities.id,
            sortOrder: 1,
        },
    });

    const apGroup = await prisma.accountGroup.upsert({
        where: { code: 'APGRP' },
        update: {},
        create: {
            name: 'Accounts Payable',
            code: 'APGRP',
            nature: 'LIABILITIES',
            type: 'SECONDARY',
            parentId: currentLiabilities.id,
            sortOrder: 1,
        },
    });

    const grirGroup = await prisma.accountGroup.upsert({
        where: { code: 'GRIRGRP' },
        update: {},
        create: {
            name: 'GR/IR Clearing',
            code: 'GRIRGRP',
            nature: 'LIABILITIES',
            type: 'SECONDARY',
            parentId: currentLiabilities.id,
            sortOrder: 2,
        },
    });

    const salesGroup = await prisma.accountGroup.upsert({
        where: { code: 'SALEGRP' },
        update: {},
        create: {
            name: 'Sales Income',
            code: 'SALEGRP',
            nature: 'INCOME',
            type: 'SECONDARY',
            parentId: income.id,
            sortOrder: 1,
        },
    });

    const cogsGroup = await prisma.accountGroup.upsert({
        where: { code: 'COGSGRP' },
        update: {},
        create: {
            name: 'Cost of Goods Sold',
            code: 'COGSGRP',
            nature: 'EXPENSES',
            type: 'SECONDARY',
            parentId: expenses.id,
            sortOrder: 1,
        },
    });

    // ======================
    // 3. LEDGERS (most important)
    // ======================
    const ledgers = [
        // Cash & Bank
        { name: 'Cash', code: 'CASH', groupId: cashBankGroup.id, ledgerType: 'CASH', isDebitBalance: true },
        { name: 'Bank', code: 'BANK', groupId: cashBankGroup.id, ledgerType: 'BANK', isDebitBalance: true },
        { name: 'Primary Bank Account', code: '1020', groupId: cashBankGroup.id, ledgerType: 'BANK', isDebitBalance: true },

        // Inventory
        { name: 'Inventory', code: 'INV', groupId: inventoryGroup.id, ledgerType: 'STOCK', isDebitBalance: true },
        { name: 'Stock', code: 'STOCK', groupId: inventoryGroup.id, ledgerType: 'STOCK', isDebitBalance: true },

        // Receivable
        { name: 'Accounts Receivable', code: 'AR', groupId: arGroup.id, ledgerType: 'CUSTOMER', isDebitBalance: true },
        { name: 'Debtors', code: 'DEBTORS', groupId: arGroup.id, ledgerType: 'CUSTOMER', isDebitBalance: true },

        // Payable
        { name: 'Accounts Payable', code: 'AP', groupId: apGroup.id, ledgerType: 'VENDOR', isDebitBalance: false },
        { name: 'Creditors', code: 'CREDITORS', groupId: apGroup.id, ledgerType: 'VENDOR', isDebitBalance: false },

        // GR/IR
        { name: 'GR/IR', code: 'GRIR', groupId: grirGroup.id, ledgerType: 'GENERAL', isDebitBalance: false },
        { name: 'Goods Received Not Invoiced', code: 'GRNI', groupId: grirGroup.id, ledgerType: 'GENERAL', isDebitBalance: false },

        // Sales
        { name: 'Sales', code: 'SALES', groupId: salesGroup.id, ledgerType: 'GENERAL', isDebitBalance: false },
        { name: 'Sales Revenue', code: '4010', groupId: salesGroup.id, ledgerType: 'GENERAL', isDebitBalance: false },

        // COGS
        { name: 'Cost of Goods Sold', code: 'COGS', groupId: cogsGroup.id, ledgerType: 'GENERAL', isDebitBalance: true },
    ];

    for (const ledger of ledgers) {
        await prisma.accountLedger.upsert({
            where: { code: ledger.code },
            update: {},
            create: {
                name: ledger.name,
                code: ledger.code,
                groupId: ledger.groupId,
                ledgerType: ledger.ledgerType,
                isDebitBalance: ledger.isDebitBalance,
                isSystem: true,
                isActive: true,
                openingBalance: 0,
                currentBalance: 0,
            },
        });
        console.log(`  ✓ Ledger: ${ledger.name} (${ledger.code})`);
    }

    // ======================
    // 4. Enable Accounts Module
    // ======================
    await prisma.systemSetting.upsert({
        where: { key: 'module_accounts' },
        update: { value: 'true' },
        create: {
            key: 'module_accounts',
            value: 'true',
            description: 'Enable Accounts module',
        },
    });

    console.log('\n✅ Accounts seeding completed successfully!');
    console.log('You can now test Purchase Order → GRN → Accounting vouchers.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });