-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('GRN', 'SALES_OUT', 'ADJUSTMENT', 'TRANSFER', 'PURCHASE_RETURN', 'CUSTOMER_RETURN');

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MovementType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_productVariantId_createdAt_idx" ON "StockMovement"("productVariantId", "createdAt");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
