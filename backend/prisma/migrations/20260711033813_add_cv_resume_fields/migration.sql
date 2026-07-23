-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "positionId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "address" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "responsibilities" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "cvLabel" TEXT;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
