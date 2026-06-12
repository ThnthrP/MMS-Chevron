-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('pending', 'passed', 'failed');

-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'submitted';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "approvedBy" TEXT;

-- AlterTable
ALTER TABLE "EmployeeTraining" ADD COLUMN     "expiryDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ManpowerRequest" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isOffshore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'draft';

-- CreateTable
CREATE TABLE "SafetyCheck" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalCheck" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SafetyCheck" ADD CONSTRAINT "SafetyCheck_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCheck" ADD CONSTRAINT "MedicalCheck_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
