/*
  Warnings:

  - The values [assigned,leave,training,medical_hold] on the enum `AvailabilityStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "WorkerMobilizationStatus" AS ENUM ('pending', 'ready', 'on_site');

-- AlterEnum
BEGIN;
CREATE TYPE "AvailabilityStatus_new" AS ENUM ('available', 'unavailable');
ALTER TABLE "Employee" ALTER COLUMN "availabilityStatus" DROP DEFAULT;
ALTER TABLE "Employee" ALTER COLUMN "availabilityStatus" TYPE "AvailabilityStatus_new" USING ("availabilityStatus"::text::"AvailabilityStatus_new");
ALTER TYPE "AvailabilityStatus" RENAME TO "AvailabilityStatus_old";
ALTER TYPE "AvailabilityStatus_new" RENAME TO "AvailabilityStatus";
DROP TYPE "AvailabilityStatus_old";
ALTER TABLE "Employee" ALTER COLUMN "availabilityStatus" SET DEFAULT 'available';
COMMIT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "mobilizationStatus" "WorkerMobilizationStatus" NOT NULL DEFAULT 'pending';
