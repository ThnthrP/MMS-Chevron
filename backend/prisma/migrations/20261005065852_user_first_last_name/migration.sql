/*
  Warnings:

  - A unique constraint covering the columns `[externalAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "externalAccountId" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_externalAccountId_key" ON "User"("externalAccountId");

-- แยกชื่อ user เดิม: คำแรก = firstName, ที่เหลือ = lastName
UPDATE "User"
SET "firstName" = split_part(btrim("name"), ' ', 1),
    "lastName"  = NULLIF(btrim(substring(btrim("name") FROM position(' ' IN btrim("name")) + 1)), '')
WHERE position(' ' IN btrim("name")) > 0;

UPDATE "User" SET "firstName" = btrim("name") WHERE position(' ' IN btrim("name")) = 0;
