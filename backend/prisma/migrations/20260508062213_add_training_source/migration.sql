-- CreateEnum
CREATE TYPE "TrainingSource" AS ENUM ('COMPANY', 'CONTRACTOR', 'TPTI');

-- AlterTable
ALTER TABLE "GlobalTraining" ADD COLUMN     "source" "TrainingSource"[];
