/*
  Warnings:

  - You are about to drop the column `requirementType` on the `PositionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `sourceMatrixCode` on the `PositionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `sourceMatrixSheet` on the `PositionRequirement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[contractId,positionId,clientTrainingId]` on the table `PositionRequirement` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PositionRequirement_positionId_clientTrainingId_contractId_key";

-- AlterTable
ALTER TABLE "PositionRequirement" DROP COLUMN "requirementType",
DROP COLUMN "sourceMatrixCode",
DROP COLUMN "sourceMatrixSheet",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "PositionRequirement_contractId_positionId_clientTrainingId_key" ON "PositionRequirement"("contractId", "positionId", "clientTrainingId");
