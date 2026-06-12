-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetOtp" TEXT,
ADD COLUMN     "resetOtpExpireAt" TIMESTAMP(3);
