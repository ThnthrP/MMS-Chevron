-- PE tracking (layout ใหม่ A..AU) — คอลัมน์ติดตามผล AN..AR + AU
ALTER TABLE "MedicalExamRecord" ADD COLUMN "followUpTopic" TEXT;
ALTER TABLE "MedicalExamRecord" ADD COLUMN "followUpNotice" TEXT;
ALTER TABLE "MedicalExamRecord" ADD COLUMN "followUpRemindBefore" TEXT;
ALTER TABLE "MedicalExamRecord" ADD COLUMN "followUpRemindOverdue" TEXT;
ALTER TABLE "MedicalExamRecord" ADD COLUMN "followUpSchedule" TEXT;
ALTER TABLE "MedicalExamRecord" ADD COLUMN "nextExamDate" TIMESTAMP(3);
