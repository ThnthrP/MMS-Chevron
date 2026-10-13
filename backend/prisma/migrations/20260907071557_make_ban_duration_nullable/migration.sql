-- CreateTable
CREATE TABLE "EmployeeBan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reasonNote" TEXT,
    "bannedFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bannedUntil" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER,
    "bannedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "liftedAt" TIMESTAMP(3),
    "liftedById" TEXT,
    "liftReason" TEXT,
    "sourceTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeBan_employeeId_isActive_idx" ON "EmployeeBan"("employeeId", "isActive");

-- AddForeignKey
ALTER TABLE "EmployeeBan" ADD CONSTRAINT "EmployeeBan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBan" ADD CONSTRAINT "EmployeeBan_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBan" ADD CONSTRAINT "EmployeeBan_liftedById_fkey" FOREIGN KEY ("liftedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
