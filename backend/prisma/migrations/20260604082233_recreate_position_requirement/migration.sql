/*
  Warnings:

  - You are about to drop the column `createdAt` on the `PositionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `isRequired` on the `PositionRequirement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[positionId,clientTrainingId,contractId]` on the table `PositionRequirement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `requirementType` to the `PositionRequirement` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PositionRequirement_contractId_positionId_clientTrainingId_key";

-- AlterTable
ALTER TABLE "PositionRequirement" DROP COLUMN "createdAt",
DROP COLUMN "isRequired",
ADD COLUMN     "requirementType" "RequirementType" NOT NULL,
ADD COLUMN     "sourceMatrixCode" TEXT,
ADD COLUMN     "sourceMatrixSheet" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PositionRequirement_positionId_clientTrainingId_contractId_key" ON "PositionRequirement"("positionId", "clientTrainingId", "contractId");
