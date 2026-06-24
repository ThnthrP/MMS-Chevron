// ════════════════════════════════════════════════════════════════
// Seed Division table จากค่า division ที่มีอยู่จริงใน Employee
// รัน 1 ครั้งหลัง migrate: docker compose exec backend node scripts/seedDivisions.js
// idempotent — รันซ้ำได้ (skipDuplicates)
// ════════════════════════════════════════════════════════════════
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ดึง division ที่ไม่ซ้ำจาก employee
  const rows = await prisma.employee.findMany({
    where: { division: { not: null } },
    distinct: ["division"],
    select: { division: true },
  });

  const names = rows.map((r) => (r.division || "").trim()).filter(Boolean);

  if (names.length === 0) {
    console.log("ไม่พบ division ใน employee — ไม่มีอะไรให้ seed");
    return;
  }

  const result = await prisma.division.createMany({
    data: names.map((name) => ({ name })),
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${result.count} divisions:`);
  names.sort().forEach((n) => console.log(`  • ${n}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
