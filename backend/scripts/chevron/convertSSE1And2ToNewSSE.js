// ============================================================
// scripts/chevron/convertSSE1And2ToNewSSE.js
//
// One-time cleanup: sse1 and sse2 should no longer be used as
// values — every Employee currently set to sse1 or sse2 gets
// converted to new_sse. This is independent of the PE tracking
// Excel file; it operates purely on whatever is already in the
// database.
//
// USAGE:
//   node scripts/chevron/convertSSE1And2ToNewSSE.js [--dry-run]
//
// OPTIONS:
//   --dry-run   List affected employees only, no database writes.
//               Always run this first.
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

async function main() {
  if (dryRun) console.log("── DRY RUN — no database writes will be made ──\n");

  const affected = await prisma.employee.findMany({
    where: { sseLevel: { in: ["sse1", "sse2"] } },
    select: { id: true, empCode: true, fullName: true, sseLevel: true },
    orderBy: { empCode: "asc" },
  });

  console.log(
    `Found ${affected.length} employee(s) with sseLevel = sse1/sse2\n`,
  );

  if (affected.length > 0) {
    for (const e of affected) {
      console.log(`  ${e.empCode}  ${e.fullName}  (was: ${e.sseLevel})`);
    }
  }

  let updated = 0;
  if (!dryRun && affected.length > 0) {
    const result = await prisma.employee.updateMany({
      where: { sseLevel: { in: ["sse1", "sse2"] } },
      data: { sseLevel: "new_sse" },
    });
    updated = result.count;
  }

  console.log("\n── Summary ──");
  console.log(`To update: ${affected.length}`);
  if (!dryRun) console.log(`Updated:   ${updated}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
