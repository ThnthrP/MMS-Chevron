/*
  Warnings:

  - Changed the type of `eventType` on the `JobConfirmationEvent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "JobConfirmationEvent" ALTER COLUMN "eventType" TYPE TEXT USING "eventType"::TEXT;
