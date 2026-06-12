/*
  Warnings:

  - The `verifyOtpExpireAt` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `resetOtpExpireAt` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "verifyOtpExpireAt",
ADD COLUMN     "verifyOtpExpireAt" TIMESTAMP(3),
DROP COLUMN "resetOtpExpireAt",
ADD COLUMN     "resetOtpExpireAt" TIMESTAMP(3);
