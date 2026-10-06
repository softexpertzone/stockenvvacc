/*
  Warnings:

  - Added the required column `batchId` to the `InternalTransferItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `InternalTransferItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "LogType" ADD VALUE 'GRN';

-- AlterTable
ALTER TABLE "InternalTransferItem" ADD COLUMN     "batchId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "InternalTransferItem_batchId_idx" ON "InternalTransferItem"("batchId");

-- CreateIndex
CREATE INDEX "InternalTransferItem_internalTransferId_idx" ON "InternalTransferItem"("internalTransferId");

-- AddForeignKey
ALTER TABLE "InternalTransferItem" ADD CONSTRAINT "InternalTransferItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransferItem" ADD CONSTRAINT "InternalTransferItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
