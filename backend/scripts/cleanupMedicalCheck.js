import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CUTOFF = new Date("2000-01-01"); // อะไรที่ expiry ก่อนปีนี้ = ขยะ (1900/0132)

async function main() {
  // ====================================================
  // 1. ลบ MedicalCheck ขยะ (expiry < 2000) — ตัวการ false "Expired"
  // ====================================================
  const garbage = await prisma.medicalCheck.count({
    where: { expiryDate: { lt: CUTOFF } },
  });
  console.log(`🔎 MedicalCheck ขยะ (expiry < 2000): ${garbage}`);

  if (garbage > 0) {
    const del = await prisma.medicalCheck.deleteMany({
      where: { expiryDate: { lt: CUTOFF } },
    });
    console.log(`🗑 ลบ medical ขยะ: ${del.count}`);
  }

  // ====================================================
  // 2. sync checkType: "Medical Checkup" -> "Medical Check up"
  //    ให้ตรงกับ getMedical / EditWorker / schema (มีเว้นวรรค)
  // ====================================================
  const toRename = await prisma.medicalCheck.count({
    where: { checkType: "Medical Checkup" },
  });
  console.log(`🔎 checkType "Medical Checkup" ที่จะ rename: ${toRename}`);

  if (toRename > 0) {
    try {
      const ren = await prisma.medicalCheck.updateMany({
        where: { checkType: "Medical Checkup" },
        data: { checkType: "Medical Check up" },
      });
      console.log(`✏️  rename -> "Medical Check up": ${ren.count}`);
    } catch (e) {
      console.error(
        `⚠ rename ชน unique constraint (มี worker ที่มีทั้ง 2 แบบ): ${e.message}`,
      );
      console.error(
        "   → มี record ซ้ำ ต้องหา/ลบตัวซ้ำก่อน แล้วรัน rename อีกที",
      );
    }
  }

  // ====================================================
  // 3. (เตือนเฉยๆ) training ขยะ expiry < 2000 — ไม่ลบ ให้เช็คเอง
  // ====================================================
  const badTraining = await prisma.employeeTraining.count({
    where: { isLatest: true, expiryDate: { lt: CUTOFF } },
  });
  console.log(
    `🔎 training (isLatest) expiry < 2000: ${badTraining} ${
      badTraining > 0 ? "← ควรเช็ค/import ใหม่" : "✓ ไม่มี"
    }`,
  );

  console.log("\n✅ cleanup เสร็จ — refresh หน้า Compliance Center ดูได้เลย");
}

main()
  .catch((err) => console.error("💥 Cleanup failed:", err))
  .finally(async () => {
    await prisma.$disconnect();
  });
