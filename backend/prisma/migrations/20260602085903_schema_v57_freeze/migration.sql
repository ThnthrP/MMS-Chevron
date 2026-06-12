/*
  Warnings:

  - You are about to drop the column `approvedBy` on the `Booking` table. All the data in the column will be lost.
  - The `status` column on the `Booking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `companyId` on the `Client` table. All the data in the column will be lost.
  - The `status` column on the `ClientApproval` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `companyId` on the `Employee` table. All the data in the column will be lost.
  - The `status` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `isNoExpiry` on the `GlobalTraining` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `GlobalTraining` table. All the data in the column will be lost.
  - You are about to drop the column `validityMonths` on the `GlobalTraining` table. All the data in the column will be lost.
  - You are about to drop the column `validityNote` on the `GlobalTraining` table. All the data in the column will be lost.
  - You are about to drop the column `requirementLevel` on the `PositionRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Subcontractor` table. All the data in the column will be lost.
  - You are about to drop the column `authority` on the `TrainingStandard` table. All the data in the column will be lost.
  - You are about to drop the column `validityMonths` on the `TrainingStandard` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[globalTrainingId,source,clientId]` on the table `TrainingStandard` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `sourceType` on the `Candidate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `requirementType` to the `PositionRequirement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `TrainingStandard` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'assigned', 'leave', 'training', 'medical_hold');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('internal', 'ces', 'contractor');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('mandatory', 'relevant', 'required', 'assigned');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('active', 'inactive', 'resigned', 'suspended');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'approved', 'deployed', 'cancelled');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterEnum
ALTER TYPE "AssignmentStatus" ADD VALUE 'cancelled';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TrainingSource" ADD VALUE 'COMPANY_ELEARNING';
ALTER TYPE "TrainingSource" ADD VALUE 'PUBLIC';

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_companyId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeTraining" DROP CONSTRAINT "EmployeeTraining_globalTrainingId_fkey";

-- DropForeignKey
ALTER TABLE "Subcontractor" DROP CONSTRAINT "Subcontractor_companyId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropIndex
DROP INDEX "Client_name_companyId_key";

-- DropIndex
DROP INDEX "EmployeeTraining_employeeId_globalTrainingId_contractId_ver_key";

-- DropIndex
DROP INDEX "TrainingStandard_globalTrainingId_authority_key";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "approvedBy",
DROP COLUMN "status",
ADD COLUMN     "status" "BookingStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "Candidate" DROP COLUMN "sourceType",
ADD COLUMN     "sourceType" "CandidateSource" NOT NULL;

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "ClientApproval" DROP COLUMN "status",
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "companyId",
ADD COLUMN     "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'available',
DROP COLUMN "status",
ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "EmployeeTraining" ADD COLUMN     "rawTrainingName" TEXT,
ALTER COLUMN "globalTrainingId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GlobalTraining" DROP COLUMN "isNoExpiry",
DROP COLUMN "source",
DROP COLUMN "validityMonths",
DROP COLUMN "validityNote";

-- AlterTable
ALTER TABLE "PositionRequirement" DROP COLUMN "requirementLevel",
ADD COLUMN     "requirementType" "RequirementType" NOT NULL,
ADD COLUMN     "sourceMatrixCode" TEXT,
ADD COLUMN     "sourceMatrixSheet" TEXT;

-- AlterTable
ALTER TABLE "Subcontractor" DROP COLUMN "companyId",
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 99;

-- AlterTable
ALTER TABLE "TrainingStandard" DROP COLUMN "authority",
DROP COLUMN "validityMonths",
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" "TrainingSource" NOT NULL,
ADD COLUMN     "trainingHours" INTEGER,
ADD COLUMN     "validityDays" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyId";

-- DropTable
DROP TABLE "Company";

-- DropEnum
DROP TYPE "RequirementLevel";

-- DropEnum
DROP TYPE "TrainingAuthority";

-- CreateTable
CREATE TABLE "Passport" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "passportNo" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" "CheckStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Passport_employeeId_key" ON "Passport"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE INDEX "EmployeeTraining_employeeId_isLatest_idx" ON "EmployeeTraining"("employeeId", "isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingStandard_globalTrainingId_source_clientId_key" ON "TrainingStandard"("globalTrainingId", "source", "clientId");

-- CreateIndex
CREATE INDEX "WorkflowLog_requestId_idx" ON "WorkflowLog"("requestId");

-- CreateIndex
CREATE INDEX "WorkflowLog_userId_idx" ON "WorkflowLog"("userId");

-- CreateIndex
CREATE INDEX "WorkflowLog_createdAt_idx" ON "WorkflowLog"("createdAt");

-- AddForeignKey
ALTER TABLE "TrainingStandard" ADD CONSTRAINT "TrainingStandard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTraining" ADD CONSTRAINT "EmployeeTraining_globalTrainingId_fkey" FOREIGN KEY ("globalTrainingId") REFERENCES "GlobalTraining"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passport" ADD CONSTRAINT "Passport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowLog" ADD CONSTRAINT "WorkflowLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ManpowerRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
