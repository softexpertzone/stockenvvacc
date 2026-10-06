/*
  Warnings:

  - The values [PENDING_DISPATCH,DISPATCHED,COMPLETED] on the enum `SalesOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUPERADMIN,MANAGER,OPERATOR] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `reason` on the `CustomerReturnItem` table. All the data in the column will be lost.
  - You are about to drop the column `processedBy` on the `PurchaseReturn` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `PurchaseReturnItem` table. All the data in the column will be lost.
  - Added the required column `partnerId` to the `CustomerReturn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CustomerReturn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reasonId` to the `CustomerReturnItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partnerId` to the `PurchaseReturn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PurchaseReturn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reasonId` to the `PurchaseReturnItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ReturnReasonType" AS ENUM ('PURCHASE', 'SALES', 'BOTH');

-- CreateEnum
CREATE TYPE "PurchaseReturnStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'SHIPPED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerReturnStatus" AS ENUM ('DRAFT', 'APPROVED', 'RECEIVED', 'INSPECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerReturnDisposition" AS ENUM ('RESTOCK', 'QUARANTINE', 'SCRAP', 'RETURN_TO_VENDOR', 'REPLACE', 'REFUND_ONLY');

-- CreateEnum
CREATE TYPE "PickStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountGroupNature" AS ENUM ('ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES', 'EQUITY');

-- CreateEnum
CREATE TYPE "AccountGroupType" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('RECEIPT', 'PAYMENT', 'CONTRA', 'JOURNAL');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('GENERAL', 'CASH', 'BANK', 'CUSTOMER', 'VENDOR', 'TAX', 'STOCK');

-- AlterEnum
ALTER TYPE "LogType" ADD VALUE 'SORTING_RECLASSIFICATION';

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'SORTING_RECLASSIFICATION';

-- AlterEnum
BEGIN;
CREATE TYPE "SalesOrderStatus_new" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'ALLOCATED_PENDING', 'ALLOCATED_PAID', 'SHIPPED_UNPAID', 'SHIPPED_COMPLETED', 'CANCELLED');
ALTER TABLE "public"."SalesOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SalesOrder" ALTER COLUMN "status" TYPE "SalesOrderStatus_new" USING ("status"::text::"SalesOrderStatus_new");
ALTER TYPE "SalesOrderStatus" RENAME TO "SalesOrderStatus_old";
ALTER TYPE "SalesOrderStatus_new" RENAME TO "SalesOrderStatus";
DROP TYPE "public"."SalesOrderStatus_old";
ALTER TABLE "SalesOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'PURCHASER', 'SALESPERSON', 'PURCHASE_VIEWER', 'SALES_VIEWER', 'PICKER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'SALES_VIEWER';
COMMIT;

-- AlterTable
ALTER TABLE "CustomerReturn" ADD COLUMN     "disposition" "CustomerReturnDisposition",
ADD COLUMN     "partnerId" TEXT NOT NULL,
ADD COLUMN     "processedById" TEXT,
ADD COLUMN     "status" "CustomerReturnStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "salesOrderId" DROP NOT NULL,
ALTER COLUMN "refundAmount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "CustomerReturnItem" DROP COLUMN "reason",
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "conditionGrade" TEXT,
ADD COLUMN     "disposition" "CustomerReturnDisposition",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "originalSalesOrderItemId" TEXT,
ADD COLUMN     "reasonId" TEXT NOT NULL,
ADD COLUMN     "targetBinId" TEXT,
ALTER COLUMN "binId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "canManagePurchase" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewPurchase" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewSales" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "courierCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
ALTER COLUMN "totalAmount" SET DEFAULT 0.0,
ALTER COLUMN "dueAmount" SET DEFAULT 0.0;

-- AlterTable
ALTER TABLE "PurchaseReturn" DROP COLUMN "processedBy",
ADD COLUMN     "grnId" TEXT,
ADD COLUMN     "partnerId" TEXT NOT NULL,
ADD COLUMN     "processedById" TEXT,
ADD COLUMN     "status" "PurchaseReturnStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "purchaseOrderId" DROP NOT NULL,
ALTER COLUMN "refundAmount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseReturnItem" DROP COLUMN "reason",
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "originalGrnItemId" TEXT,
ADD COLUMN     "reasonId" TEXT NOT NULL,
ADD COLUMN     "unitCost" DECIMAL(12,2),
ALTER COLUMN "binId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "courierCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "taxName" TEXT,
ADD COLUMN     "taxRate" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "StockAllocation" ADD COLUMN     "pickListId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "role" SET DEFAULT 'SALES_VIEWER';

-- DropEnum
DROP TYPE "ReturnReason";

-- CreateTable
CREATE TABLE "ReturnReasonMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ReturnReasonType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnReasonMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickList" (
    "id" TEXT NOT NULL,
    "pickNumber" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" "PickStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReevaluation" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "grnId" TEXT,
    "performedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReevaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReevaluationItem" (
    "id" TEXT NOT NULL,
    "reevaluationId" TEXT NOT NULL,
    "originalVariantId" TEXT NOT NULL,
    "newVariantId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantityConverted" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReevaluationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupToken" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "webViewLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nature" "AccountGroupNature" NOT NULL,
    "type" "AccountGroupType" NOT NULL DEFAULT 'PRIMARY',
    "parentId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountLedger" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "ledgerType" "LedgerType" NOT NULL DEFAULT 'GENERAL',
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isDebitBalance" BOOLEAN NOT NULL DEFAULT true,
    "partnerId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "voucherDate" TIMESTAMP(3) NOT NULL,
    "financialYear" TEXT,
    "narration" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "totalDebit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdById" TEXT,
    "postedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherEntry" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "lineNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnReasonMaster_code_key" ON "ReturnReasonMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PickList_pickNumber_key" ON "PickList"("pickNumber");

-- CreateIndex
CREATE INDEX "PickList_salesOrderId_idx" ON "PickList"("salesOrderId");

-- CreateIndex
CREATE INDEX "PickList_assignedToId_idx" ON "PickList"("assignedToId");

-- CreateIndex
CREATE INDEX "StockReevaluation_purchaseOrderId_idx" ON "StockReevaluation"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "StockReevaluation_grnId_idx" ON "StockReevaluation"("grnId");

-- CreateIndex
CREATE INDEX "StockReevaluationItem_reevaluationId_idx" ON "StockReevaluationItem"("reevaluationId");

-- CreateIndex
CREATE INDEX "StockReevaluationItem_originalVariantId_idx" ON "StockReevaluationItem"("originalVariantId");

-- CreateIndex
CREATE INDEX "StockReevaluationItem_newVariantId_idx" ON "StockReevaluationItem"("newVariantId");

-- CreateIndex
CREATE INDEX "StockReevaluationItem_binId_idx" ON "StockReevaluationItem"("binId");

-- CreateIndex
CREATE INDEX "StockReevaluationItem_batchId_idx" ON "StockReevaluationItem"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGroup_code_key" ON "AccountGroup"("code");

-- CreateIndex
CREATE INDEX "AccountGroup_parentId_idx" ON "AccountGroup"("parentId");

-- CreateIndex
CREATE INDEX "AccountGroup_nature_idx" ON "AccountGroup"("nature");

-- CreateIndex
CREATE INDEX "AccountGroup_code_idx" ON "AccountGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccountLedger_code_key" ON "AccountLedger"("code");

-- CreateIndex
CREATE INDEX "AccountLedger_groupId_idx" ON "AccountLedger"("groupId");

-- CreateIndex
CREATE INDEX "AccountLedger_code_idx" ON "AccountLedger"("code");

-- CreateIndex
CREATE INDEX "AccountLedger_partnerId_idx" ON "AccountLedger"("partnerId");

-- CreateIndex
CREATE INDEX "AccountLedger_ledgerType_idx" ON "AccountLedger"("ledgerType");

-- CreateIndex
CREATE INDEX "AccountLedger_isActive_groupId_idx" ON "AccountLedger"("isActive", "groupId");

-- CreateIndex
CREATE INDEX "AccountLedger_ledgerType_isActive_idx" ON "AccountLedger"("ledgerType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNumber_key" ON "Voucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "Voucher_voucherType_voucherDate_idx" ON "Voucher"("voucherType", "voucherDate");

-- CreateIndex
CREATE INDEX "Voucher_status_idx" ON "Voucher"("status");

-- CreateIndex
CREATE INDEX "Voucher_financialYear_idx" ON "Voucher"("financialYear");

-- CreateIndex
CREATE INDEX "Voucher_referenceType_referenceId_idx" ON "Voucher"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "Voucher_status_voucherDate_idx" ON "Voucher"("status", "voucherDate");

-- CreateIndex
CREATE INDEX "VoucherEntry_voucherId_idx" ON "VoucherEntry"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherEntry_ledgerId_idx" ON "VoucherEntry"("ledgerId");

-- CreateIndex
CREATE INDEX "VoucherEntry_ledgerId_voucherId_idx" ON "VoucherEntry"("ledgerId", "voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "CustomerReturn_salesOrderId_idx" ON "CustomerReturn"("salesOrderId");

-- CreateIndex
CREATE INDEX "CustomerReturn_partnerId_idx" ON "CustomerReturn"("partnerId");

-- CreateIndex
CREATE INDEX "CustomerReturn_status_idx" ON "CustomerReturn"("status");

-- CreateIndex
CREATE INDEX "CustomerReturnItem_binId_idx" ON "CustomerReturnItem"("binId");

-- CreateIndex
CREATE INDEX "CustomerReturnItem_targetBinId_idx" ON "CustomerReturnItem"("targetBinId");

-- CreateIndex
CREATE INDEX "CustomerReturnItem_batchId_idx" ON "CustomerReturnItem"("batchId");

-- CreateIndex
CREATE INDEX "CustomerReturnItem_originalSalesOrderItemId_idx" ON "CustomerReturnItem"("originalSalesOrderItemId");

-- CreateIndex
CREATE INDEX "PurchaseReturn_purchaseOrderId_idx" ON "PurchaseReturn"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseReturn_partnerId_idx" ON "PurchaseReturn"("partnerId");

-- CreateIndex
CREATE INDEX "PurchaseReturn_status_idx" ON "PurchaseReturn"("status");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_batchId_idx" ON "PurchaseReturnItem"("batchId");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_originalGrnItemId_idx" ON "PurchaseReturnItem"("originalGrnItemId");

-- CreateIndex
CREATE INDEX "StockAllocation_pickListId_idx" ON "StockAllocation"("pickListId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "ReturnReasonMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_originalGrnItemId_fkey" FOREIGN KEY ("originalGrnItemId") REFERENCES "GRNItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "PickList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_targetBinId_fkey" FOREIGN KEY ("targetBinId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "ReturnReasonMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_originalSalesOrderItemId_fkey" FOREIGN KEY ("originalSalesOrderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickList" ADD CONSTRAINT "PickList_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickList" ADD CONSTRAINT "PickList_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReevaluation" ADD CONSTRAINT "StockReevaluation_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReevaluation" ADD CONSTRAINT "StockReevaluation_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReevaluation" ADD CONSTRAINT "StockReevaluation_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReevaluationItem" ADD CONSTRAINT "StockReevaluationItem_reevaluationId_fkey" FOREIGN KEY ("reevaluationId") REFERENCES "StockReevaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReevaluationItem" ADD CONSTRAINT "StockReevaluationItem_originalVariantId_fkey" FOREIGN KEY ("originalVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReevaluationItem" ADD CONSTRAINT "StockReevaluationItem_newVariantId_fkey" FOREIGN KEY ("newVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReevaluationItem" ADD CONSTRAINT "StockReevaluationItem_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReevaluationItem" ADD CONSTRAINT "StockReevaluationItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountLedger" ADD CONSTRAINT "AccountLedger_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AccountGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountLedger" ADD CONSTRAINT "AccountLedger_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherEntry" ADD CONSTRAINT "VoucherEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherEntry" ADD CONSTRAINT "VoucherEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "AccountLedger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
