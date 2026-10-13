-- 1) สร้างตารางใหม่
CREATE TABLE "TrainingSourceOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiresClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingSourceOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrainingSourceOption_name_key" ON "TrainingSourceOption"("name");

-- 2) seed ค่าเดิมจาก enum เป็น row
INSERT INTO "TrainingSourceOption" ("id", "name", "requiresClient") VALUES
  (gen_random_uuid()::text, 'Company', true),
  (gen_random_uuid()::text, 'Company e-learning', false),
  (gen_random_uuid()::text, 'TPTI', false),
  (gen_random_uuid()::text, 'Contractor', false),
  (gen_random_uuid()::text, 'Public', false);

-- 3) เพิ่ม column sourceId (nullable ก่อน)
ALTER TABLE "TrainingStandard" ADD COLUMN "sourceId" TEXT;

-- 4) backfill จาก enum เดิม -> id ของ row ใหม่
UPDATE "TrainingStandard" ts
SET "sourceId" = tso.id
FROM "TrainingSourceOption" tso
WHERE
  (ts.source = 'COMPANY' AND tso.name = 'Company') OR
  (ts.source = 'COMPANY_ELEARNING' AND tso.name = 'Company e-learning') OR
  (ts.source = 'TPTI' AND tso.name = 'TPTI') OR
  (ts.source = 'CONTRACTOR' AND tso.name = 'Contractor') OR
  (ts.source = 'PUBLIC' AND tso.name = 'Public');

-- 5) บังคับ NOT NULL + FK
ALTER TABLE "TrainingStandard" ALTER COLUMN "sourceId" SET NOT NULL;
ALTER TABLE "TrainingStandard" ADD CONSTRAINT "TrainingStandard_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "TrainingSourceOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) ลบ constraint/column เก่า สร้าง unique ใหม่
ALTER TABLE "TrainingStandard" DROP CONSTRAINT IF EXISTS "TrainingStandard_globalTrainingId_source_clientId_key";
ALTER TABLE "TrainingStandard" DROP COLUMN "source";
CREATE UNIQUE INDEX "TrainingStandard_globalTrainingId_sourceId_clientId_key"
  ON "TrainingStandard"("globalTrainingId", "sourceId", "clientId");

-- 7) ลบ enum เดิม
DROP TYPE "TrainingSource";