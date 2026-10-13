-- CreateTable
CREATE TABLE "MedicalRequestBatch" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRequestBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRequestItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "checkType" TEXT,
    "clientName" TEXT,
    "reason" TEXT,

    CONSTRAINT "MedicalRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalRequestItem_batchId_idx" ON "MedicalRequestItem"("batchId");

-- AddForeignKey
ALTER TABLE "MedicalRequestBatch" ADD CONSTRAINT "MedicalRequestBatch_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRequestItem" ADD CONSTRAINT "MedicalRequestItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MedicalRequestBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRequestItem" ADD CONSTRAINT "MedicalRequestItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
