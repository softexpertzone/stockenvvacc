-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updatedAt" DROP DEFAULT;
