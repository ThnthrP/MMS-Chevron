// ════════════════════════════════════════════════════════════════
// Backfill Employee.division จาก position name (ใช้ POSITION_DIVISION)
// รัน: docker compose exec backend node scripts/backfillDivisions.js
// (วาง positionDivisionMap.js ไว้โฟลเดอร์เดียวกัน หรือแก้ path import)
// //import { POSITION_DIVISION } from "./positionDivisionMap.js";
  // ตอนสร้าง employee: division: POSITION_DIVISION[positionName] || null
// ════════════════════════════════════════════════════════════════
import { PrismaClient } from "@prisma/client";
import { POSITION_DIVISION } from "./positionDivisionMap.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Backfilling Employee.division ...\n");

  let totalUpdated = 0;

  // update ทีละ position (updateMany ผ่าน relation filter)
  for (const [position, division] of Object.entries(POSITION_DIVISION)) {
    const res = await prisma.employee.updateMany({
      where: { position: { name: position } },
      data: { division },
    });
    totalUpdated += res.count;
    console.log(
      `  ${position.padEnd(48)} → ${division.padEnd(16)} (${res.count})`,
    );
  }

  console.log(`\n✅ Updated ${totalUpdated} employees.`);

  // ── สรุปจำนวนต่อ division ──
  const all = await prisma.employee.findMany({
    select: { division: true },
  });
  const byDiv = {};
  for (const e of all) {
    const key = e.division || "(none)";
    byDiv[key] = (byDiv[key] || 0) + 1;
  }
  console.log("\n📊 Division summary:");
  Object.entries(byDiv)
    .sort((a, b) => b[1] - a[1])
    .forEach(([d, n]) => console.log(`  ${d.padEnd(18)} ${n}`));

  // ── เตือน position ที่ยังไม่ถูก map (division ว่าง) ──
  const unmapped = await prisma.employee.findMany({
    where: { OR: [{ division: null }, { division: "" }] },
    select: { position: { select: { name: true } } },
  });
  if (unmapped.length) {
    const names = [
      ...new Set(unmapped.map((e) => e.position?.name || "(no position)")),
    ];
    console.log(
      `\n⚠ ${unmapped.length} employees ยังไม่มี division — position ที่ยังไม่ map:`,
    );
    names.forEach((n) => console.log(`  • ${n}`));
    console.log("  → เพิ่ม key พวกนี้ใน positionDivisionMap.js แล้วรันซ้ำได้");
  } else {
    console.log("\n🎉 ทุกคนมี division ครบแล้ว");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
