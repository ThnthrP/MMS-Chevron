/*
  Warnings:

  - You are about to drop the column `servicePosition` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `trainingId` on the `EmployeeTraining` table. All the data in the column will be lost.
  - The `status` column on the `EmployeeTraining` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `servicePosition` on the `ManpowerRequest` table. All the data in the column will be lost.
  - You are about to drop the `Certificate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerDecision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HealthCertificate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Training` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[employeeId,skillId]` on the table `EmployeeSkill` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeId,globalTrainingId,contractId,version]` on the table `EmployeeTraining` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeId,checkType,medicalRequirementId]` on the table `MedicalCheck` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Skill` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `globalTrainingId` to the `EmployeeTraining` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `EmployeeTraining` table without a default value. This is not possible if the table is not empty.
  - Added the required column `positionId` to the `ManpowerRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checkType` to the `MedicalCheck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MedicalCheck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contractId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('completed', 'due_soon', 'overdue', 'pending', 'if_required', 'not_applicable');

-- CreateEnum
CREATE TYPE "TrainingCategory" AS ENUM ('safety', 'technical', 'offshore', 'medical', 'legal', 'client_specific', 'administrative', 'other');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('mandatory', 'relevant', 'required', 'optional');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('manpower_supply', 'material_supply', 'maintenance', 'project');

-- CreateEnum
CREATE TYPE "GapType" AS ENUM ('training', 'medical');

-- CreateEnum
CREATE TYPE "GapStatus" AS ENUM ('passed', 'missing', 'overdue', 'due_soon');

-- CreateEnum
CREATE TYPE "SubRequestStatus" AS ENUM ('inquiring', 'quote_requested', 'quote_received', 'sse_review', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "MobilizationTaskType" AS ENUM ('vessel_booking', 'line_group', 'ppe_preparation', 'transport_booking', 'hotel_booking', 'accounting_notify', 'drug_test');

-- CreateEnum
CREATE TYPE "MobilizationTaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'not_required');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CheckStatus" ADD VALUE 'overdue';
ALTER TYPE "CheckStatus" ADD VALUE 'due_soon';
ALTER TYPE "CheckStatus" ADD VALUE 'not_required';

-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerDecision" DROP CONSTRAINT "CustomerDecision_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerDecision" DROP CONSTRAINT "CustomerDecision_decidedById_fkey";

-- DropForeignKey
ALTER TABLE "CustomerDecision" DROP CONSTRAINT "CustomerDecision_requestId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeTraining" DROP CONSTRAINT "EmployeeTraining_trainingId_fkey";

-- DropForeignKey
ALTER TABLE "HealthCertificate" DROP CONSTRAINT "HealthCertificate_employeeId_fkey";

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "matchPct" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "servicePosition",
ADD COLUMN     "covidVac" TEXT,
ADD COLUMN     "division" TEXT,
ADD COLUMN     "fullNameTH" TEXT,
ADD COLUMN     "pdpaConsent" BOOLEAN,
ADD COLUMN     "positionId" TEXT;

-- AlterTable
ALTER TABLE "EmployeeTraining" DROP COLUMN "trainingId",
ADD COLUMN     "clientTrainingId" TEXT,
ADD COLUMN     "completedDate" TIMESTAMP(3),
ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "globalTrainingId" TEXT NOT NULL,
ADD COLUMN     "isLatest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "remindDate" TIMESTAMP(3),
ADD COLUMN     "remindDays" INTEGER,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourceFile" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "status",
ADD COLUMN     "status" "TrainingStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "ManpowerRequest" DROP COLUMN "servicePosition",
ADD COLUMN     "positionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MedicalCheck" ADD COLUMN     "checkType" TEXT NOT NULL,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "hospital" TEXT,
ADD COLUMN     "issuedDate" TIMESTAMP(3),
ADD COLUMN     "medicalRequirementId" TEXT,
ADD COLUMN     "remindDate" TIMESTAMP(3),
ADD COLUMN     "remindDays" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "contractId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isOffshore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SafetyCheck" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "requestId" TEXT;

-- DropTable
DROP TABLE "Certificate";

-- DropTable
DROP TABLE "CustomerDecision";

-- DropTable
DROP TABLE "HealthCertificate";

-- DropTable
DROP TABLE "Training";

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "type" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractNo" TEXT,
    "name" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "matrixVersion" TEXT,
    "matrixDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTH" TEXT,
    "category" TEXT,
    "isOffshore" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalTraining" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" "TrainingCategory" NOT NULL,
    "validityYears" DOUBLE PRECISION,
    "validityNote" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTraining" (
    "id" TEXT NOT NULL,
    "globalTrainingId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "nameAlias" TEXT,
    "codeAlias" TEXT,
    "validityYearsOverride" DOUBLE PRECISION,

    CONSTRAINT "ClientTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionRequirement" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "clientTrainingId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "requirementType" "RequirementType" NOT NULL DEFAULT 'mandatory',

    CONSTRAINT "PositionRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRequirement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "validityYears" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MedicalRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateScore" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "certScore" INTEGER NOT NULL DEFAULT 0,
    "medicalScore" INTEGER NOT NULL DEFAULT 0,
    "experienceScore" INTEGER NOT NULL DEFAULT 0,
    "availabilityScore" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateGap" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "gapType" "GapType" NOT NULL,
    "status" "GapStatus" NOT NULL,
    "globalTrainingId" TEXT,
    "medicalRequirementId" TEXT,
    "itemName" TEXT NOT NULL,
    "itemCategory" TEXT,

    CONSTRAINT "CandidateGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientApproval" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "decidedById" TEXT,
    "status" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SSERecord" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "totalSSE" INTEGER NOT NULL,
    "onboardCount" INTEGER NOT NULL,
    "onboardPct" DOUBLE PRECISION NOT NULL,
    "documentNotes" TEXT,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SSERecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcontractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactTel" TEXT,
    "contactEmail" TEXT,
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subcontractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractorRequest" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "SubRequestStatus" NOT NULL DEFAULT 'inquiring',
    "quoteSentAt" TIMESTAMP(3),
    "quoteReceivedAt" TIMESTAMP(3),
    "quotedPrice" DOUBLE PRECISION,
    "quoteCurrency" TEXT DEFAULT 'THB',
    "sseReviewedAt" TIMESTAMP(3),
    "sseReviewedById" TEXT,
    "sseReviewNotes" TEXT,
    "signedOffAt" TIMESTAMP(3),
    "signedOffById" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcontractorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractorHire" (
    "id" TEXT NOT NULL,
    "subcontractorRequestId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "SubcontractorHire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilizationTask" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "taskType" "MobilizationTaskType" NOT NULL,
    "status" "MobilizationTaskStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "vesselName" TEXT,
    "departureDate" TIMESTAMP(3),
    "transportType" TEXT,
    "pickupLocation" TEXT,
    "hotelName" TEXT,
    "checkInDate" TIMESTAMP(3),
    "checkOutDate" TIMESTAMP(3),
    "lineGroupName" TEXT,
    "lineGroupUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilizationTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_companyId_key" ON "Client"("name", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_clientId_contractNo_key" ON "Contract"("clientId", "contractNo");

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalTraining_name_key" ON "GlobalTraining"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTraining_globalTrainingId_contractId_key" ON "ClientTraining"("globalTrainingId", "contractId");

-- CreateIndex
CREATE UNIQUE INDEX "PositionRequirement_positionId_clientTrainingId_contractId_key" ON "PositionRequirement"("positionId", "clientTrainingId", "contractId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRequirement_clientId_name_key" ON "MedicalRequirement"("clientId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateScore_candidateId_key" ON "CandidateScore"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientApproval_candidateId_key" ON "ClientApproval"("candidateId");

-- CreateIndex
CREATE INDEX "SSERecord_requestId_idx" ON "SSERecord"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "SSERecord_requestId_round_key" ON "SSERecord"("requestId", "round");

-- CreateIndex
CREATE INDEX "SubcontractorRequest_requestId_idx" ON "SubcontractorRequest"("requestId");

-- CreateIndex
CREATE INDEX "SubcontractorRequest_subcontractorId_idx" ON "SubcontractorRequest"("subcontractorId");

-- CreateIndex
CREATE UNIQUE INDEX "SubcontractorHire_subcontractorRequestId_employeeId_key" ON "SubcontractorHire"("subcontractorRequestId", "employeeId");

-- CreateIndex
CREATE INDEX "MobilizationTask_bookingId_idx" ON "MobilizationTask"("bookingId");

-- CreateIndex
CREATE INDEX "MobilizationTask_taskType_status_idx" ON "MobilizationTask"("taskType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSkill_employeeId_skillId_key" ON "EmployeeSkill"("employeeId", "skillId");

-- CreateIndex
CREATE INDEX "EmployeeTraining_employeeId_globalTrainingId_isLatest_idx" ON "EmployeeTraining"("employeeId", "globalTrainingId", "isLatest");

-- CreateIndex
CREATE INDEX "EmployeeTraining_expiryDate_isLatest_idx" ON "EmployeeTraining"("expiryDate", "isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeTraining_employeeId_globalTrainingId_contractId_ver_key" ON "EmployeeTraining"("employeeId", "globalTrainingId", "contractId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalCheck_employeeId_checkType_medicalRequirementId_key" ON "MedicalCheck"("employeeId", "checkType", "medicalRequirementId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTraining" ADD CONSTRAINT "ClientTraining_globalTrainingId_fkey" FOREIGN KEY ("globalTrainingId") REFERENCES "GlobalTraining"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTraining" ADD CONSTRAINT "ClientTraining_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionRequirement" ADD CONSTRAINT "PositionRequirement_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionRequirement" ADD CONSTRAINT "PositionRequirement_clientTrainingId_fkey" FOREIGN KEY ("clientTrainingId") REFERENCES "ClientTraining"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionRequirement" ADD CONSTRAINT "PositionRequirement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRequirement" ADD CONSTRAINT "MedicalRequirement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTraining" ADD CONSTRAINT "EmployeeTraining_globalTrainingId_fkey" FOREIGN KEY ("globalTrainingId") REFERENCES "GlobalTraining"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTraining" ADD CONSTRAINT "EmployeeTraining_clientTrainingId_fkey" FOREIGN KEY ("clientTrainingId") REFERENCES "ClientTraining"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCheck" ADD CONSTRAINT "MedicalCheck_medicalRequirementId_fkey" FOREIGN KEY ("medicalRequirementId") REFERENCES "MedicalRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManpowerRequest" ADD CONSTRAINT "ManpowerRequest_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateScore" ADD CONSTRAINT "CandidateScore_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateGap" ADD CONSTRAINT "CandidateGap_globalTrainingId_fkey" FOREIGN KEY ("globalTrainingId") REFERENCES "GlobalTraining"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateGap" ADD CONSTRAINT "CandidateGap_medicalRequirementId_fkey" FOREIGN KEY ("medicalRequirementId") REFERENCES "MedicalRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateGap" ADD CONSTRAINT "CandidateGap_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApproval" ADD CONSTRAINT "ClientApproval_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApproval" ADD CONSTRAINT "ClientApproval_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ManpowerRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApproval" ADD CONSTRAINT "ClientApproval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SSERecord" ADD CONSTRAINT "SSERecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ManpowerRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcontractor" ADD CONSTRAINT "Subcontractor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractorRequest" ADD CONSTRAINT "SubcontractorRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ManpowerRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractorRequest" ADD CONSTRAINT "SubcontractorRequest_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractorRequest" ADD CONSTRAINT "SubcontractorRequest_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractorHire" ADD CONSTRAINT "SubcontractorHire_subcontractorRequestId_fkey" FOREIGN KEY ("subcontractorRequestId") REFERENCES "SubcontractorRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractorHire" ADD CONSTRAINT "SubcontractorHire_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilizationTask" ADD CONSTRAINT "MobilizationTask_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
