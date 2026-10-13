/*
  Warnings:

  - The `healthRisk` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `healthRisk` column on the `MedicalExamRecord` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "healthRisk",
ADD COLUMN     "healthRisk" TEXT;

-- AlterTable
ALTER TABLE "MedicalExamRecord" DROP COLUMN "healthRisk",
ADD COLUMN     "healthRisk" TEXT;

-- DropEnum
DROP TYPE "HealthRisk";
