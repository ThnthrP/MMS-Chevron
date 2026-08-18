-- ============================================================
-- Migration: rename_health_risk_add_medical_exam
-- HAND-EDITED — do not regenerate this file with `prisma migrate dev`
-- without re-applying these edits. Prisma's auto-diff would DROP the
-- old "medium" enum value before any row referencing it is migrated,
-- which fails on existing data. This version renames the value in
-- place instead, so no data is lost and no manual UPDATE is needed.
-- ============================================================

-- Step 1: rename the existing enum value (safe — updates the label,
-- not the underlying data; every row that was 'medium' now reads
-- 'moderate' automatically, no UPDATE statement needed).
ALTER TYPE "HealthRisk" RENAME VALUE 'medium' TO 'moderate';

-- Step 2: add the two new enum values.
-- NOTE (Postgres < 12 only): ALTER TYPE ... ADD VALUE cannot be used
-- in the same transaction as a statement that *uses* the new value.
-- Prisma's migrate runner wraps each migration file in a transaction,
-- so on Postgres < 12 this migration must be split into two files —
-- run this one first, then a second migration containing only the
-- MedicalExamRecord table creation. On Postgres >= 12 this is not an
-- issue and the whole file can run as-is in one transaction.
ALTER TYPE "HealthRisk" ADD VALUE IF NOT EXISTS 'significant';
ALTER TYPE "HealthRisk" ADD VALUE IF NOT EXISTS 'pending';

-- Step 3: create MedicalExamRecord table
CREATE TABLE "MedicalExamRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "medicalCheckId" TEXT,

    "examDate" TIMESTAMP(3),

    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "hematocritPct" DOUBLE PRECISION,

    "urineResult" TEXT,
    "urineAbnormalNote" TEXT,

    "bloodSugar" DOUBLE PRECISION,
    "ldl" DOUBLE PRECISION,
    "triglyceride" DOUBLE PRECISION,
    "sgot" DOUBLE PRECISION,
    "sgpt" DOUBLE PRECISION,
    "uricAcid" DOUBLE PRECISION,

    "ekgResult" TEXT,
    "ekgAbnormalNote" TEXT,
    "chestXrayResult" TEXT,
    "chestXrayAbnormalNote" TEXT,
    "dentalResult" TEXT,
    "dentalAbnormalNote" TEXT,
    "estResult" TEXT,
    "estAbnormalNote" TEXT,

    "note" TEXT,

    "healthRisk" "HealthRisk",
    "recommendation" TEXT,
    "commentDate" TIMESTAMP(3),

    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,

    "source" TEXT,
    "sourceFile" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalExamRecord_pkey" PRIMARY KEY ("id")
);

-- Step 4: unique constraint on medicalCheckId (1-to-1 optional link)
CREATE UNIQUE INDEX "MedicalExamRecord_medicalCheckId_key" ON "MedicalExamRecord"("medicalCheckId");

-- Step 5: index for the common query pattern (employee's latest record)
CREATE INDEX "MedicalExamRecord_employeeId_isLatest_idx" ON "MedicalExamRecord"("employeeId", "isLatest");

-- Step 6: foreign keys
ALTER TABLE "MedicalExamRecord" ADD CONSTRAINT "MedicalExamRecord_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicalExamRecord" ADD CONSTRAINT "MedicalExamRecord_medicalCheckId_fkey"
    FOREIGN KEY ("medicalCheckId") REFERENCES "MedicalCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
