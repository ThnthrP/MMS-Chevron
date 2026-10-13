// ============================================================
// scripts/chevron/findPotentialDuplicateEmployees.js
//
// One-off diagnostic: groups Employee rows by birthDate. Two
// employees sharing the exact same birthDate are very likely the
// same real person recorded twice under different name spellings
// (e.g. English transliteration "Jumkhom" vs "Joomkom") — the kind
// of thing that makes importMedicalExamRecords.js's name-based
// matching silently create a second person instead of updating the
// first.
//
// This does NOT touch the database. It only reports groups for you
// to review and manually decide which record to keep / merge.
//
// USAGE:
//   node scripts/chevron/findPotentialDuplicateEmployees.js
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      fullName: true,
      fullNameTH: true,
      fullNameEN: true,
      birthDate: true,
      status: true,
      medicalExamRecords: {
        where: { isLatest: true },
        select: { id: true },
      },
    },
  });

  const withBirthDate = employees.filter((e) => e.birthDate);
  const noBirthDate = employees.length - withBirthDate.length;

  const groups = new Map(); // birthDate (yyyy-mm-dd) -> Employee[]
  for (const e of withBirthDate) {
    const key = fmtDate(e.birthDate);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const duplicateGroups = [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  console.log(`Total employees:              ${employees.length}`);
  console.log(
    `Without a birthDate at all:   ${noBirthDate} (can't be checked by this script)`,
  );
  console.log(`Birth dates shared by 2+ people: ${duplicateGroups.length}`);

  if (duplicateGroups.length === 0) {
    console.log("\nNo same-birthDate groups found.");
    await prisma.$disconnect();
    return;
  }

  console.log("\n── Possible duplicates (same birthDate) ──");
  for (const [birthDate, list] of duplicateGroups) {
    console.log(`\n  Birth date: ${birthDate}`);
    for (const e of list) {
      const hasExam = e.medicalExamRecords.length > 0 ? "has exam" : "NO exam";
      console.log(
        `    ${e.empCode}  TH="${e.fullNameTH || "—"}"  EN="${e.fullNameEN || "—"}"  fullName="${e.fullName}"  status=${e.status}  [${hasExam}]`,
      );
    }
  }

  console.log(
    "\nNote: same birthDate is a strong hint, not proof — please eyeball each group before merging/deleting anything. This script makes no changes.",
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
