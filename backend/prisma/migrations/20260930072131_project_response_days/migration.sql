/*
  Warnings:

  - You are about to drop the column `responseDeadline` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "responseDeadline",
ADD COLUMN     "responseDays" INTEGER NOT NULL DEFAULT 10;
