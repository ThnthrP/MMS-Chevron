// backend/scripts/listDeletableChevronTrainings.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const chevron = await prisma.client.findFirst({ where: { name: "Chevron" } });
  if (!chevron) {
    console.log("ไม่พบ client Chevron");
    return;
  }

  const clientTrainings = await prisma.clientTraining.findMany({
    where: { contract: { clientId: chevron.id } },
    include: {
      globalTraining: { select: { name: true } },
      contract: { select: { name: true } },
      _count: { select: { requirements: true } },
    },
  });

  console.log(`ตรวจ ${clientTrainings.length} training ที่ผูกกับ Chevron...\n`);

  const deletable = [];
  const blocked = [];

  for (const ct of clientTrainings) {
    const employeeCount = await prisma.employeeTraining.count({
      where: { clientTrainingId: ct.id },
    });
    const positionCount = ct._count.requirements;

    if (positionCount === 0 && employeeCount === 0) {
      deletable.push(ct.globalTraining.name);
    } else {
      blocked.push({
        name: ct.globalTraining.name,
        positionCount,
        employeeCount,
      });
    }
  }

  console.log("✅ ลบได้เลย (ไม่มี position ต้องการ + ไม่มีพนักงาน import):");
  deletable.forEach((n) => console.log(`  - ${n}`));

  console.log("\n⛔ ลบไม่ได้ (มี position หรือพนักงานผูกอยู่):");
  blocked.forEach((b) =>
    console.log(
      `  - ${b.name} (position: ${b.positionCount}, employee: ${b.employeeCount})`,
    ),
  );

  console.log(`\nสรุป: ลบได้ ${deletable.length} / ลบไม่ได้ ${blocked.length}`);
}

main()
  .catch((err) => console.error("💥 Error:", err))
  .finally(async () => await prisma.$disconnect());
