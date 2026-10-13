/*
  Warnings:

  - The `status` column on the `LeaveRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DEFAULT 'pending';
