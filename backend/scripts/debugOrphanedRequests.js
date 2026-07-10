// ════════════════════════════════════════════════════════════════
// debugOrphanedRequests.js
// เช็ค ManpowerRequest ของ project นี้:
//   1) positionId ชี้ไปหา Position ที่ยังมีอยู่จริงไหม (required relation)
//   2) โชว์ raw bookings ของแต่ละ request (ดูว่ามี field ผิดปกติไหม)
//
// อ่านอย่างเดียว ไม่เขียน DB
//
//   node scripts/debugOrphanedRequests.js b55377ae-209c-444f-9539-0833797645d4
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const projectId = process.argv[2];

if (!projectId) {
  console.log("ใช้: node scripts/debugOrphanedRequests.js <projectId>");
  process.exit(1);
}

async function main() {
  const requests = await prisma.manpowerRequest.findMany({
    where: { projectId },
  });

  console.log(`\n🔍 Project: ${projectId}`);
  console.log(`   ManpowerRequest ทั้งหมด: ${requests.length}\n`);

  if (requests.length === 0) {
    console.log("⚠ ไม่มี request เลย — แปลกเพราะภาพบอกว่ามี 4 positions");
    await prisma.$disconnect();
    return;
  }

  // ── เช็ค positionId orphaned ──
  const positionIds = [
    ...new Set(requests.map((r) => r.positionId).filter(Boolean)),
  ];
  const existingPositions = await prisma.position.findMany({
    where: { id: { in: positionIds } },
    select: { id: true, name: true },
  });
  const existingPosIds = new Set(existingPositions.map((p) => p.id));

  console.log("===== Position check =====");
  for (const r of requests) {
    const ok = r.positionId ? existingPosIds.has(r.positionId) : null;
    console.log(
      `  request.id=${r.id}  positionId=${r.positionId}  ${
        r.positionId === null
          ? "⚠ NULL positionId"
          : ok
            ? "✅ OK"
            : "❌ ORPHANED — position ไม่มีอยู่จริง"
      }`,
    );
  }

  // ── โชว์ raw bookings ของแต่ละ request ──
  console.log("\n===== Bookings (raw) =====");
  for (const r of requests) {
    const bookings = await prisma.booking.findMany({
      where: { requestId: r.id },
    });
    console.log(`  request.id=${r.id} → bookings: ${bookings.length}`);
    for (const b of bookings) {
      console.log(`    ${JSON.stringify(b)}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("💥 Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
