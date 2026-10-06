/*
  Warnings:

  - You are about to drop the column `definitionId` on the `AttributeValue` table. All the data in the column will be lost.
  - The `status` column on the `GRN` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `rackId` on the `InventoryBalance` table. All the data in the column will be lost.
  - You are about to drop the column `returnedKg` on the `InventoryBalance` table. All the data in the column will be lost.
  - You are about to drop the column `soldKg` on the `InventoryBalance` table. All the data in the column will be lost.
  - You are about to drop the column `totalPurchasedKg` on the `InventoryBalance` table. All the data in the column will be lost.
  - You are about to alter the column `creditLimit` on the `Partner` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `balance` on the `Partner` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `totalAmount` on the `Purchase` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - The `status` column on the `PurchaseOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `roomId` on the `Rack` table. All the data in the column will be lost.
  - You are about to drop the column `godownId` on the `Room` table. All the data in the column will be lost.
  - You are about to alter the column `totalAmount` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - The `status` column on the `SalesOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `destinationRackId` on the `StockLog` table. All the data in the column will be lost.
  - You are about to drop the column `sourceRackId` on the `StockLog` table. All the data in the column will be lost.
  - You are about to drop the `Inventory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[attributeDefId,value]` on the table `AttributeValue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productVariantId,binId,batchId]` on the table `InventoryBalance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[barcode]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,aisleId]` on the table `Rack` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,zoneId]` on the table `Room` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderRef]` on the table `SalesOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `attributeDefId` to the `AttributeValue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `binId` to the `GRNItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchId` to the `InventoryBalance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `binId` to the `InventoryBalance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processedBy` to the `PurchaseReturn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `aisleId` to the `Rack` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zoneId` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `SalesOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderRef` to the `SalesOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SalesOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderedQuantity` to the `SalesOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SalesOrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'PENDING_DISPATCH', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'ZONE', 'ROOM', 'AISLE', 'RACK', 'SHELF', 'BIN');

-- CreateEnum
CREATE TYPE "PutAwayStrategy" AS ENUM ('EMPTY_RACK_FIRST', 'CONSOLIDATE_STOCK', 'FILL_TO_CAPACITY', 'FIXED_LOCATION');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED_ON_ARRIVAL', 'QUALITY_REJECTION', 'EXPIRED_STOCK', 'WRONG_ITEM');

-- AlterEnum
ALTER TYPE "LogType" ADD VALUE 'SALES_OUTBOUND';

-- DropForeignKey
ALTER TABLE "AttributeValue" DROP CONSTRAINT "AttributeValue_definitionId_fkey";

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_rackId_fkey";

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_variantId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryBalance" DROP CONSTRAINT "InventoryBalance_rackId_fkey";

-- DropForeignKey
ALTER TABLE "Rack" DROP CONSTRAINT "Rack_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_godownId_fkey";

-- DropIndex
DROP INDEX "AttributeValue_definitionId_value_key";

-- DropIndex
DROP INDEX "InventoryBalance_productVariantId_rackId_key";

-- DropIndex
DROP INDEX "Rack_name_roomId_key";

-- DropIndex
DROP INDEX "Room_name_godownId_key";

-- AlterTable
ALTER TABLE "AttributeValue" DROP COLUMN "definitionId",
ADD COLUMN     "attributeDefId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GRN" DROP COLUMN "status",
ADD COLUMN     "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'RECEIVED';

-- AlterTable
ALTER TABLE "GRNItem" ADD COLUMN     "binId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Godown" ADD COLUMN     "isDefaultReceiving" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "InventoryBalance" DROP COLUMN "rackId",
DROP COLUMN "returnedKg",
DROP COLUMN "soldKg",
DROP COLUMN "totalPurchasedKg",
ADD COLUMN     "batchId" TEXT NOT NULL,
ADD COLUMN     "binId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lotId" TEXT;

-- AlterTable
ALTER TABLE "Partner" ALTER COLUMN "creditLimit" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "defaultBinId" TEXT,
ADD COLUMN     "heightCm" DECIMAL(10,2),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lengthCm" DECIMAL(10,2),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "volumeCm3" DECIMAL(15,2),
ADD COLUMN     "weightKg" DECIMAL(10,3),
ADD COLUMN     "widthCm" DECIMAL(10,2),
ALTER COLUMN "price" SET DEFAULT 0.00,
ALTER COLUMN "purchasePrice" SET DEFAULT 0.00,
ALTER COLUMN "minStockLevel" SET DEFAULT 10;

-- AlterTable
ALTER TABLE "Purchase" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "status",
ADD COLUMN     "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "PurchaseReturn" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "processedBy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Rack" DROP COLUMN "roomId",
ADD COLUMN     "aisleId" TEXT NOT NULL,
ADD COLUMN     "currentVolume" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "currentWeight" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "maxVolumeCm3" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "maxWeightKg" DECIMAL(12,2) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "godownId",
ADD COLUMN     "zoneId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "buyerName" TEXT,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "orderRef" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "balanceDue" SET DEFAULT 0.0,
DROP COLUMN "status",
ADD COLUMN     "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "SalesOrderItem" ADD COLUMN     "binId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "orderedQuantity" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "quantityCount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "StockLog" DROP COLUMN "destinationRackId",
DROP COLUMN "sourceRackId",
ADD COLUMN     "destinationBinId" TEXT,
ADD COLUMN     "sourceBinId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "purchaseOrderId" TEXT,
ADD COLUMN     "salesOrderId" TEXT;

-- DropTable
DROP TABLE "Inventory";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "POStatus";

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "godownId" TEXT NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aisle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "Aisle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelf" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rackId" TEXT NOT NULL,
    "maxWeightKg" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "maxVolumeCm3" DECIMAL(15,2) NOT NULL DEFAULT 0.0,

    CONSTRAINT "Shelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shelfId" TEXT NOT NULL,
    "maxWeightKg" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "maxVolumeCm3" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "currentWeight" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "currentVolume" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
    "proximityIndex" INTEGER NOT NULL DEFAULT 50,
    "storageClass" TEXT NOT NULL DEFAULT 'GENERAL',

    CONSTRAINT "Bin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "manufactureDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "productVariantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "parentId" TEXT,
    "godownId" TEXT,
    "maxWeightKg" DECIMAL(10,2),
    "maxVolumeCm3" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "variantId" TEXT NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PutAwayRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "strategy" "PutAwayStrategy" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "targetBinId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PutAwayRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalTransfer" (
    "id" TEXT NOT NULL,
    "transferRef" TEXT NOT NULL,
    "processedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalTransferItem" (
    "id" TEXT NOT NULL,
    "internalTransferId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "sourceBinId" TEXT NOT NULL,
    "destinationBinId" TEXT NOT NULL,
    "quantityCount" INTEGER NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL DEFAULT 0.0,

    CONSTRAINT "InternalTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReturnItem" (
    "id" TEXT NOT NULL,
    "purchaseReturnId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "quantityCount" INTEGER NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL DEFAULT 0.0,
    "reason" "ReturnReason" NOT NULL,

    CONSTRAINT "PurchaseReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAllocation" (
    "id" TEXT NOT NULL,
    "salesOrderItemId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "allocatedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_godownId_key" ON "Zone"("name", "godownId");

-- CreateIndex
CREATE UNIQUE INDEX "Aisle_name_roomId_key" ON "Aisle"("name", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_name_rackId_key" ON "Shelf"("name", "rackId");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_name_shelfId_key" ON "Bin"("name", "shelfId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchNumber_key" ON "Batch"("batchNumber");

-- CreateIndex
CREATE INDEX "Location_parentId_idx" ON "Location"("parentId");

-- CreateIndex
CREATE INDEX "Location_godownId_idx" ON "Location"("godownId");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotNumber_key" ON "Lot"("lotNumber");

-- CreateIndex
CREATE INDEX "Lot_variantId_idx" ON "Lot"("variantId");

-- CreateIndex
CREATE INDEX "PutAwayRule_categoryId_idx" ON "PutAwayRule"("categoryId");

-- CreateIndex
CREATE INDEX "PutAwayRule_priority_idx" ON "PutAwayRule"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "InternalTransfer_transferRef_key" ON "InternalTransfer"("transferRef");

-- CreateIndex
CREATE INDEX "InternalTransferItem_sourceBinId_idx" ON "InternalTransferItem"("sourceBinId");

-- CreateIndex
CREATE INDEX "InternalTransferItem_destinationBinId_idx" ON "InternalTransferItem"("destinationBinId");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_binId_idx" ON "PurchaseReturnItem"("binId");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_purchaseReturnId_idx" ON "PurchaseReturnItem"("purchaseReturnId");

-- CreateIndex
CREATE INDEX "StockAllocation_lotId_idx" ON "StockAllocation"("lotId");

-- CreateIndex
CREATE INDEX "StockAllocation_binId_idx" ON "StockAllocation"("binId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeValue_attributeDefId_value_key" ON "AttributeValue"("attributeDefId", "value");

-- CreateIndex
CREATE INDEX "GRNItem_binId_idx" ON "GRNItem"("binId");

-- CreateIndex
CREATE INDEX "GRNItem_grnId_idx" ON "GRNItem"("grnId");

-- CreateIndex
CREATE INDEX "InventoryBalance_binId_idx" ON "InventoryBalance"("binId");

-- CreateIndex
CREATE INDEX "InventoryBalance_productVariantId_idx" ON "InventoryBalance"("productVariantId");

-- CreateIndex
CREATE INDEX "InventoryBalance_batchId_idx" ON "InventoryBalance"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_productVariantId_binId_batchId_key" ON "InventoryBalance"("productVariantId", "binId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_barcode_key" ON "ProductVariant"("barcode");

-- CreateIndex
CREATE INDEX "ProductVariant_barcode_idx" ON "ProductVariant"("barcode");

-- CreateIndex
CREATE INDEX "ProductVariant_currentStock_idx" ON "ProductVariant"("currentStock");

-- CreateIndex
CREATE UNIQUE INDEX "Rack_name_aisleId_key" ON "Rack"("name", "aisleId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_zoneId_key" ON "Room"("name", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_orderRef_key" ON "SalesOrder"("orderRef");

-- CreateIndex
CREATE INDEX "SalesOrder_partnerId_idx" ON "SalesOrder"("partnerId");

-- CreateIndex
CREATE INDEX "SalesOrder_customerId_idx" ON "SalesOrder"("customerId");

-- CreateIndex
CREATE INDEX "SalesOrder_invoiceNumber_idx" ON "SalesOrder"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SalesOrder_orderRef_idx" ON "SalesOrder"("orderRef");

-- CreateIndex
CREATE INDEX "SalesOrder_status_idx" ON "SalesOrder"("status");

-- CreateIndex
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_productVariantId_idx" ON "SalesOrderItem"("productVariantId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_binId_idx" ON "SalesOrderItem"("binId");

-- CreateIndex
CREATE INDEX "StockLog_sourceBinId_idx" ON "StockLog"("sourceBinId");

-- CreateIndex
CREATE INDEX "StockLog_destinationBinId_idx" ON "StockLog"("destinationBinId");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "Godown"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aisle" ADD CONSTRAINT "Aisle_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_aisleId_fkey" FOREIGN KEY ("aisleId") REFERENCES "Aisle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bin" ADD CONSTRAINT "Bin_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_defaultBinId_fkey" FOREIGN KEY ("defaultBinId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_attributeDefId_fkey" FOREIGN KEY ("attributeDefId") REFERENCES "AttributeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_sourceBinId_fkey" FOREIGN KEY ("sourceBinId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_destinationBinId_fkey" FOREIGN KEY ("destinationBinId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutAwayRule" ADD CONSTRAINT "PutAwayRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutAwayRule" ADD CONSTRAINT "PutAwayRule_targetBinId_fkey" FOREIGN KEY ("targetBinId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransferItem" ADD CONSTRAINT "InternalTransferItem_internalTransferId_fkey" FOREIGN KEY ("internalTransferId") REFERENCES "InternalTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransferItem" ADD CONSTRAINT "InternalTransferItem_sourceBinId_fkey" FOREIGN KEY ("sourceBinId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransferItem" ADD CONSTRAINT "InternalTransferItem_destinationBinId_fkey" FOREIGN KEY ("destinationBinId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNItem" ADD CONSTRAINT "GRNItem_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_salesOrderItemId_fkey" FOREIGN KEY ("salesOrderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
