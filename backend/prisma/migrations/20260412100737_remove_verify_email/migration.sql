/*
  Warnings:

  - You are about to drop the column `isAccountVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verifyOtp` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verifyOtpExpireAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "isAccountVerified",
DROP COLUMN "verifyOtp",
DROP COLUMN "verifyOtpExpireAt";
