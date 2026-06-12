-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "verifyOtp" TEXT,
    "verifyOtpExpireAt" INTEGER,
    "isAccountVerified" BOOLEAN NOT NULL DEFAULT false,
    "resetOtp" TEXT,
    "resetOtpExpireAt" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "peopleCount" INTEGER,
    "name" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "quantity" INTEGER,
    "size" TEXT,
    "weight" INTEGER,
    "image" TEXT,
    "purpose" TEXT,
    "date" TIMESTAMP(3),
    "time" TEXT,
    "durationHours" INTEGER,
    "durationMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
