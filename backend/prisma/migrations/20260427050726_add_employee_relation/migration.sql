/*
  Warnings:

  - A unique constraint covering the columns `[employeeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "isOffshore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "servicePosition" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
