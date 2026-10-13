/*
  Warnings:

  - A unique constraint covering the columns `[empId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "empId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_empId_key" ON "Employee"("empId");
