-- CreateTable
CREATE TABLE "MatchExceptionRequest" (
    "id" TEXT NOT NULL,
    "manpowerRequestId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "matchPct" DOUBLE PRECISION NOT NULL,
    "missingTrainings" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchExceptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchExceptionRequest_status_idx" ON "MatchExceptionRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MatchExceptionRequest_manpowerRequestId_employeeId_key" ON "MatchExceptionRequest"("manpowerRequestId", "employeeId");

-- AddForeignKey
ALTER TABLE "MatchExceptionRequest" ADD CONSTRAINT "MatchExceptionRequest_manpowerRequestId_fkey" FOREIGN KEY ("manpowerRequestId") REFERENCES "ManpowerRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchExceptionRequest" ADD CONSTRAINT "MatchExceptionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchExceptionRequest" ADD CONSTRAINT "MatchExceptionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchExceptionRequest" ADD CONSTRAINT "MatchExceptionRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
