/*
  Warnings:

  - You are about to drop the column `lotId` on the `InventoryBalance` table. All the data in the column will be lost.
  - You are about to drop the column `lotId` on the `StockAllocation` table. All the data in the column will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockMovement` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `batchId` to the `StockAllocation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Batch" DROP CONSTRAINT "Batch_productVariantId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryBalance" DROP CONSTRAINT "InventoryBalance_lotId_fkey";

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Lot" DROP CONSTRAINT "Lot_variantId_fkey";

-- DropForeignKey
ALTER TABLE "PutAwayRule" DROP CONSTRAINT "PutAwayRule_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "PutAwayRule" DROP CONSTRAINT "PutAwayRule_targetBinId_fkey";

-- DropForeignKey
ALTER TABLE "StockAllocation" DROP CONSTRAINT "StockAllocation_lotId_fkey";

-- DropForeignKey
ALTER TABLE "StockLog" DROP CONSTRAINT "StockLog_destinationBinId_fkey";

-- DropForeignKey
ALTER TABLE "StockLog" DROP CONSTRAINT "StockLog_productVariantId_fkey";

-- DropForeignKey
ALTER TABLE "StockLog" DROP CONSTRAINT "StockLog_sourceBinId_fkey";

-- DropIndex
DROP INDEX "StockAllocation_lotId_idx";

-- AlterTable
ALTER TABLE "InventoryBalance" DROP COLUMN "lotId",
ADD COLUMN     "allocatedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockAllocation" DROP COLUMN "lotId",
ADD COLUMN     "batchId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Location";

-- DropTable
DROP TABLE "Lot";

-- DropTable
DROP TABLE "StockLog";

-- DropTable
DROP TABLE "StockMovement";

-- CreateTable
CREATE TABLE "StockLedger" (
    "id" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "sourceBinId" TEXT,
    "destinationBinId" TEXT,
    "quantityCount" INTEGER NOT NULL DEFAULT 0,
    "quantityKg" DECIMAL(12,3) NOT NULL DEFAULT 0.0,
    "type" "LogType" NOT NULL,
    "reference" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLedger_productVariantId_createdAt_idx" ON "StockLedger"("productVariantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockLedger_sourceBinId_idx" ON "StockLedger"("sourceBinId");

-- CreateIndex
CREATE INDEX "StockLedger_destinationBinId_idx" ON "StockLedger"("destinationBinId");

-- CreateIndex
CREATE INDEX "Batch_productVariantId_idx" ON "Batch"("productVariantId");

-- CreateIndex
CREATE INDEX "StockAllocation_batchId_idx" ON "StockAllocation"("batchId");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedger" ADD CONSTRAINT "StockLedger_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedger" ADD CONSTRAINT "StockLedger_sourceBinId_fkey" FOREIGN KEY ("sourceBinId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedger" ADD CONSTRAINT "StockLedger_destinationBinId_fkey" FOREIGN KEY ("destinationBinId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutAwayRule" ADD CONSTRAINT "PutAwayRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutAwayRule" ADD CONSTRAINT "PutAwayRule_targetBinId_fkey" FOREIGN KEY ("targetBinId") REFERENCES "Bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
