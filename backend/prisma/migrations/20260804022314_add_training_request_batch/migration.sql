-- CreateTable
CREATE TABLE "TrainingRequestBatch" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingRequestBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRequestItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "globalTrainingId" TEXT NOT NULL,
    "clientName" TEXT,

    CONSTRAINT "TrainingRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingRequestItem_batchId_idx" ON "TrainingRequestItem"("batchId");

-- AddForeignKey
ALTER TABLE "TrainingRequestBatch" ADD CONSTRAINT "TrainingRequestBatch_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequestItem" ADD CONSTRAINT "TrainingRequestItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TrainingRequestBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequestItem" ADD CONSTRAINT "TrainingRequestItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequestItem" ADD CONSTRAINT "TrainingRequestItem_globalTrainingId_fkey" FOREIGN KEY ("globalTrainingId") REFERENCES "GlobalTraining"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
