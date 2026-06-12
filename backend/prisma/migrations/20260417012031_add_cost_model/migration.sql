-- CreateTable
CREATE TABLE "Cost" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
