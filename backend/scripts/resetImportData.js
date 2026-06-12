import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetImportData() {
  console.log("🗑 Resetting import data...");

  // ======================================================
  // Employee Trainings
  // ======================================================

  await prisma.employeeTraining.deleteMany();

  console.log("✔ EmployeeTraining cleared");

  // ======================================================
  // Medical Checks
  // ======================================================

  await prisma.medicalCheck.deleteMany();

  console.log("✔ MedicalCheck cleared");

  // ======================================================
  // Position Requirements
  // ======================================================

  await prisma.positionRequirement.deleteMany();

  console.log("✔ PositionRequirement cleared");

  // ======================================================
  // Employees
  // ======================================================

  await prisma.employee.deleteMany({
    where: {
      OR: [
        {
          empCode: {
            startsWith: "CHV-",
          },
        },

        {
          empCode: {
            startsWith: "ERW-",
          },
        },
      ],
    },
  });

  console.log("✔ Chevron/Erawan Employees cleared");

  console.log("\n✅ Reset completed");
}

resetImportData()
  .catch((err) => {
    console.error("💥 Reset failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
