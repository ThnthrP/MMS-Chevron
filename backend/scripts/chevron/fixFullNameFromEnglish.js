// ============================================================
// scripts/chevron/fixFullNameFromEnglish.js
//
// One-off backfill: fixes Employee.fullName for rows created by
// the (now-patched) addMissingEmployeesFromPETracking.js bug,
// where fullName was set to the Thai name instead of the English
// name — even though fullNameEN was already stored correctly.
//
// Only touches rows where:
//   - fullName currently contains Thai script (the buggy state)
//   - fullNameEN is present (so we have something correct to copy from)
//
// Rows that were already created/edited with an English fullName
// are untouched — they don't match the Thai-script check.
//
// USAGE:
//   node scripts/chevron/fixFullNameFromEnglish.js [--dry-run]
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

function looksLikeThaiName(s) {
  return !!s && /[\u0E00-\u0E7F]/.test(s);
}

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      fullName: true,
      fullNameEN: true,
      fullNameTH: true,
    },
  });

  const affected = employees.filter(
    (e) => looksLikeThaiName(e.fullName) && e.fullNameEN,
  );

  console.log(`Total employees:     ${employees.length}`);
  console.log(`Affected (to fix):   ${affected.length}`);
  if (dryRun) console.log("── DRY RUN — no writes ──\n");

  for (const e of affected) {
    console.log(`  ${e.empCode}: "${e.fullName}" → "${e.fullNameEN}"`);
    if (!dryRun) {
      await prisma.employee.update({
        where: { id: e.id },
        data: { fullName: e.fullNameEN },
      });
    }
  }

  console.log(
    `\n${dryRun ? "Would update" : "Updated"}: ${affected.length} record(s)`,
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
