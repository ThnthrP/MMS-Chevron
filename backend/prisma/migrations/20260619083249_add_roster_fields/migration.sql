-- CreateEnum
CREATE TYPE "HealthRisk" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "SSELevel" AS ENUM ('new_sse', 'sse1', 'sse2');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "demobDate" TIMESTAMP(3),
ADD COLUMN     "mobDate" TIMESTAMP(3),
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "healthNote" TEXT,
ADD COLUMN     "healthRisk" "HealthRisk",
ADD COLUMN     "isPermanent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sseCompleted" BOOLEAN,
ADD COLUMN     "sseLevel" "SSELevel";
