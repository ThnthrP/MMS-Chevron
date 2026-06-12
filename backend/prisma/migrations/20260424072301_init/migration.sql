/*
  Warnings:

  - You are about to drop the column `date` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `durationHours` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `durationMinutes` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `peopleCount` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `purpose` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleType` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetOtp` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetOtpExpireAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Cost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `employeeId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('draft', 'matching', 'proposing', 'waiting_customer', 'approved', 'rejected', 'booked', 'deployed');

-- CreateEnum
CREATE TYPE "SelectionMode" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('proposed', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('planned', 'active', 'completed');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "Cost" DROP CONSTRAINT "Cost_vehicleId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "date",
DROP COLUMN "department",
DROP COLUMN "destination",
DROP COLUMN "durationHours",
DROP COLUMN "durationMinutes",
DROP COLUMN "image",
DROP COLUMN "name",
DROP COLUMN "origin",
DROP COLUMN "peopleCount",
DROP COLUMN "phone",
DROP COLUMN "position",
DROP COLUMN "purpose",
DROP COLUMN "quantity",
DROP COLUMN "size",
DROP COLUMN "time",
DROP COLUMN "type",
DROP COLUMN "userId",
DROP COLUMN "vehicleId",
DROP COLUMN "vehicleType",
DROP COLUMN "weight",
ADD COLUMN     "employeeId" TEXT NOT NULL,
ADD COLUMN     "requestId" TEXT NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "department",
DROP COLUMN "phone",
DROP COLUMN "resetOtp",
DROP COLUMN "resetOtpExpireAt",
DROP COLUMN "role",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Cost";

-- DropTable
DROP TABLE "Vehicle";

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "empCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSkill" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTraining" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "EmployeeTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManpowerRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "servicePosition" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selectionMode" "SelectionMode" NOT NULL DEFAULT 'manual',
    "status" "RequestStatus" NOT NULL DEFAULT 'matching',
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManpowerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateRound" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'proposed',

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDecision" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "decidedById" TEXT,
    "status" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_empCode_key" ON "Employee"("empCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerDecision_candidateId_key" ON "CustomerDecision"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_bookingId_key" ON "Assignment"("bookingId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTraining" ADD CONSTRAINT "EmployeeTraining_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTraining" ADD CONSTRAINT "EmployeeTraining_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManpowerRequest" ADD CONSTRAINT "ManpowerRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManpowerRequest" ADD CONSTRAINT "ManpowerRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateRound" ADD CONSTRAINT "CandidateRound_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ManpowerRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "CandidateRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDecision" ADD CONSTRAINT "CustomerDecision_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDecision" ADD CONSTRAINT "CustomerDecision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ManpowerRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDecision" ADD CONSTRAINT "CustomerDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ManpowerRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowLog" ADD CONSTRAINT "WorkflowLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
