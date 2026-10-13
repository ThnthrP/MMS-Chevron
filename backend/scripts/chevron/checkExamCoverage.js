// ============================================================
// scripts/chevron/checkExamCoverage.js
//
// One-off diagnostic: how many Employees exist vs how many have a
// latest MedicalExamRecord. Also lists the employees with NO exam
// record at all, so you can see who's missing from the PE tracking
// export and why.
//
// USAGE:
//   node scripts/chevron/checkExamCoverage.js
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      fullName: true,
      fullNameTH: true,
      status: true,
      medicalExamRecords: {
        where: { isLatest: true },
        select: { id: true },
      },
    },
  });

  const total = employees.length;
  const withExam = employees.filter((e) => e.medicalExamRecords.length > 0);
  const withoutExam = employees.filter(
    (e) => e.medicalExamRecords.length === 0,
  );

  console.log("Total employees:            ", total);
  console.log("With latest exam record:    ", withExam.length);
  console.log("WITHOUT any exam record:    ", withoutExam.length);

  if (withoutExam.length > 0) {
    console.log("\n── Employees with no MedicalExamRecord ──");
    for (const e of withoutExam) {
      console.log(
        `  ${e.empCode}  ${e.fullNameTH || e.fullName}  (status: ${e.status})`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
