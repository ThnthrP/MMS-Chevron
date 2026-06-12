/*
  Warnings:

  - You are about to drop the column `codeAlias` on the `ClientTraining` table. All the data in the column will be lost.
  - You are about to drop the column `validityYearsOverride` on the `ClientTraining` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `GlobalTraining` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `GlobalTraining` table. All the data in the column will be lost.
  - You are about to drop the column `validityYears` on the `GlobalTraining` table. All the data in the column will be lost.
  - You are about to drop the column `validityYears` on the `MedicalRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `requirementType` on the `PositionRequirement` table. All the data in the column will be lost.
  - Added the required column `trainingStandardId` to the `ClientTraining` table without a default value. This is not possible if the table is not empty.
  - Added the required column `validityMonths` to the `MedicalRequirement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requirementLevel` to the `PositionRequirement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequirementLevel" AS ENUM ('S', 'B', 'A', 'A1');

-- CreateEnum
CREATE TYPE "TrainingAuthority" AS ENUM ('COMPANY', 'TPTI', 'THAI_LAW', 'CLIENT');

-- AlterTable
ALTER TABLE "ClientTraining" DROP COLUMN "codeAlias",
DROP COLUMN "validityYearsOverride",
ADD COLUMN     "trainingStandardId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GlobalTraining" DROP COLUMN "category",
DROP COLUMN "code",
DROP COLUMN "validityYears",
ADD COLUMN     "isNoExpiry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "validityMonths" INTEGER;

-- AlterTable
ALTER TABLE "MedicalRequirement" DROP COLUMN "validityYears",
ADD COLUMN     "validityMonths" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PositionRequirement" DROP COLUMN "requirementType",
ADD COLUMN     "requirementLevel" "RequirementLevel" NOT NULL;

-- DropEnum
DROP TYPE "RequirementType";

-- DropEnum
DROP TYPE "TrainingCategory";

-- CreateTable
CREATE TABLE "TrainingStandard" (
    "id" TEXT NOT NULL,
    "globalTrainingId" TEXT NOT NULL,
    "authority" "TrainingAuthority" NOT NULL,
    "validityMonths" INTEGER,
    "isNoExpiry" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TrainingStandard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingStandard_globalTrainingId_authority_key" ON "TrainingStandard"("globalTrainingId", "authority");

-- AddForeignKey
ALTER TABLE "TrainingStandard" ADD CONSTRAINT "TrainingStandard_globalTrainingId_fkey" FOREIGN KEY ("globalTrainingId") REFERENCES "GlobalTraining"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTraining" ADD CONSTRAINT "ClientTraining_trainingStandardId_fkey" FOREIGN KEY ("trainingStandardId") REFERENCES "TrainingStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
