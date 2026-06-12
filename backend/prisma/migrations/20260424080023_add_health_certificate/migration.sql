-- CreateTable
CREATE TABLE "HealthCertificate" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCertificate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HealthCertificate" ADD CONSTRAINT "HealthCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
