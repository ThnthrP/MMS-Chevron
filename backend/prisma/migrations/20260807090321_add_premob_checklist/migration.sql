-- CreateEnum
CREATE TYPE "CheckResult" AS ENUM ('pass', 'fail', 'not_applicable');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MobilizationTaskType" ADD VALUE 'alcohol_test';
ALTER TYPE "MobilizationTaskType" ADD VALUE 'ppe_inspection';
ALTER TYPE "MobilizationTaskType" ADD VALUE 'pre_field_training';
ALTER TYPE "MobilizationTaskType" ADD VALUE 'baggage_inspection';
ALTER TYPE "MobilizationTaskType" ADD VALUE 'blood_pressure_check';

-- AlterTable
ALTER TABLE "MobilizationTask" ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "checkedById" TEXT,
ADD COLUMN     "measuredValue" TEXT,
ADD COLUMN     "resultStatus" "CheckResult";
