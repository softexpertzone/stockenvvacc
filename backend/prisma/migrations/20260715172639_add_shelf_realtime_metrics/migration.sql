/*
  Warnings:

  - The `paymentMethod` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdBy` on the `SalesOrder` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Purchase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sale` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `godownId` to the `Bin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `SalesOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'PICKER');

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_partnerId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_createdById_fkey";

-- DropIndex
DROP INDEX "InventoryBalance_lastStockMovement_idx";

-- DropIndex
DROP INDEX "ProductVariant_currentStock_idx";

-- DropIndex
DROP INDEX "SalesOrder_orderRef_idx";

-- DropIndex
DROP INDEX "SalesOrder_status_idx";

-- DropIndex
DROP INDEX "SalesOrderItem_binId_idx";

-- AlterTable
ALTER TABLE "Bin" ADD COLUMN     "godownId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "createdById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SalesOrder" DROP COLUMN "createdBy",
ADD COLUMN     "createdById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Shelf" ADD COLUMN     "currentVolume" DECIMAL(15,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "currentWeight" DECIMAL(12,2) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- DropTable
DROP TABLE "Purchase";

-- DropTable
DROP TABLE "Sale";

-- DropEnum
DROP TYPE "LocationType";

-- DropEnum
DROP TYPE "RecordStatus";

-- CreateTable
CREATE TABLE "CustomerReturnItem" (
    "id" TEXT NOT NULL,
    "customerReturnId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "quantityCount" INTEGER NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL DEFAULT 0.0,
    "reason" "ReturnReason" NOT NULL,

    CONSTRAINT "CustomerReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerReturnItem_customerReturnId_idx" ON "CustomerReturnItem"("customerReturnId");

-- CreateIndex
CREATE INDEX "Bin_godownId_idx" ON "Bin"("godownId");

-- AddForeignKey
ALTER TABLE "Bin" ADD CONSTRAINT "Bin_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "Godown"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_customerReturnId_fkey" FOREIGN KEY ("customerReturnId") REFERENCES "CustomerReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
