-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('sick', 'personal', 'vacation', 'other');

-- CreateEnum
CREATE TYPE "WorkerConfirmStatus" AS ENUM ('pending', 'confirmed', 'rejected');

-- CreateEnum
CREATE TYPE "JobConfirmationEventType" AS ENUM ('received', 'confirmed', 'rejected', 'briefed', 'traveling');

-- CreateEnum
CREATE TYPE "PPERequestStatus" AS ENUM ('requested', 'approved', 'issued');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "workerConfirmStatus" "WorkerConfirmStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "MedicalExamRecord" ADD COLUMN     "flaggedAbnormal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hdl" DOUBLE PRECISION,
ADD COLUMN     "totalCholesterol" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "EmployeePin" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "attachmentUrl" TEXT,
    "attachmentFileName" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "approverNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobConfirmationEvent" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "eventType" "JobConfirmationEventType" NOT NULL,
    "note" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobConfirmationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PPERequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "bookingId" TEXT,
    "items" JSONB NOT NULL,
    "status" "PPERequestStatus" NOT NULL DEFAULT 'requested',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),

    CONSTRAINT "PPERequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyExam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyExamAttempt" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "bookingId" TEXT,
    "score" INTEGER,
    "passed" BOOLEAN,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePin_employeeId_key" ON "EmployeePin"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_status_idx" ON "LeaveRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "JobConfirmationEvent_candidateId_idx" ON "JobConfirmationEvent"("candidateId");

-- CreateIndex
CREATE INDEX "PPERequest_employeeId_status_idx" ON "PPERequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "SafetyExamAttempt_employeeId_examId_idx" ON "SafetyExamAttempt"("employeeId", "examId");

-- AddForeignKey
ALTER TABLE "EmployeePin" ADD CONSTRAINT "EmployeePin_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobConfirmationEvent" ADD CONSTRAINT "JobConfirmationEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPERequest" ADD CONSTRAINT "PPERequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPERequest" ADD CONSTRAINT "PPERequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyExamAttempt" ADD CONSTRAINT "SafetyExamAttempt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyExamAttempt" ADD CONSTRAINT "SafetyExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "SafetyExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyExamAttempt" ADD CONSTRAINT "SafetyExamAttempt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
