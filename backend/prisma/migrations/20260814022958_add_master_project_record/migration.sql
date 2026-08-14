/*
  Warnings:

  - A unique constraint covering the columns `[masterProjectRecordId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "masterProjectRecordId" TEXT;

-- CreateTable
CREATE TABLE "MasterProjectRecord" (
    "id" TEXT NOT NULL,
    "owner" TEXT,
    "year" INTEGER NOT NULL,
    "projectCode" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "ccNo" TEXT,
    "engineer" TEXT,
    "customerName" TEXT,
    "wrPoSr" TEXT,
    "woAfe" TEXT,
    "wa" TEXT,
    "exptEq" TEXT,
    "termOfPaymentDays" INTEGER,
    "company" TEXT,
    "team" TEXT,
    "paymentTerms" TEXT,
    "totalValue" DECIMAL(14,2),
    "sourceFile" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterProjectRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterProjectRecord_projectCode_key" ON "MasterProjectRecord"("projectCode");

-- CreateIndex
CREATE INDEX "MasterProjectRecord_year_idx" ON "MasterProjectRecord"("year");

-- CreateIndex
CREATE INDEX "MasterProjectRecord_company_idx" ON "MasterProjectRecord"("company");

-- CreateIndex
CREATE UNIQUE INDEX "Project_masterProjectRecordId_key" ON "Project"("masterProjectRecordId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_masterProjectRecordId_fkey" FOREIGN KEY ("masterProjectRecordId") REFERENCES "MasterProjectRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
