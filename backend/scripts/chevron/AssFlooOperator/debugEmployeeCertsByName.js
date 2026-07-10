// ════════════════════════════════════════════════════════════════
// debugEmployeeCertsByName.js
// เช็ค record EmployeeTraining (isLatest:true) ปัจจุบันของพนักงาน 1 คน
// ตรงๆ จาก DB — ไม่ผ่านหน้าเว็บ กัน cache/refresh หลอกตา
//
//   node scripts/chevron/debugEmployeeCertsByName.js "Pison Katnak"
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const searchName = process.argv[2];

if (!searchName) {
  console.log(
    'ใช้: node scripts/chevron/debugEmployeeCertsByName.js "ชื่อพนักงาน"',
  );
  process.exit(1);
}

async function main() {
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { fullName: { contains: searchName, mode: "insensitive" } },
        { fullNameEN: { contains: searchName, mode: "insensitive" } },
        { fullNameTH: { contains: searchName, mode: "insensitive" } },
      ],
    },
  });

  if (!employee) {
    console.log(`⚠ ไม่พบพนักงานชื่อ "${searchName}"`);
    await prisma.$disconnect();
    return;
  }

  console.log(
    `\n👤 ${employee.fullNameEN || employee.fullName}  (id: ${employee.id}, empCode: ${employee.empCode})\n`,
  );

  // เช็ค contract เดียวกับที่ importEmployeeTrainings_AssFlooOperator.js resolve ไป
  // เพื่อเทียบว่า contractId ของ demo_seed ตรงกันไหม
  const client = await prisma.client.findFirst({ where: { name: "Chevron" } });
  const contract = client
    ? await prisma.contract.findFirst({
        where: { clientId: client.id, isActive: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  console.log(
    `📌 Contract ที่ import script ใช้ (CHV-2025) : ${contract?.id ?? "ไม่พบ"}\n`,
  );

  const trainings = await prisma.employeeTraining.findMany({
    where: {
      employeeId: employee.id,
      isLatest: true,
    },
    include: {
      globalTraining: { select: { name: true } },
    },
    orderBy: { globalTraining: { name: "asc" } },
  });

  console.log(
    `พบ certification ปัจจุบัน (isLatest:true) ทั้งหมด: ${trainings.length}\n`,
  );
  console.log("========================================================");

  for (const t of trainings) {
    console.log(`\n📋 ${t.globalTraining.name}`);
    console.log(`   status        : ${t.status}`);
    console.log(`   contractId    : ${t.contractId}`);
    console.log(
      `   completedDate : ${t.completedDate ? t.completedDate.toISOString().slice(0, 10) : "null"}`,
    );
    console.log(
      `   expiryDate    : ${t.expiryDate ? t.expiryDate.toISOString().slice(0, 10) : "null"}`,
    );
    console.log(`   version       : ${t.version}`);
    console.log(`   source        : ${t.source}`);
    console.log(`   sourceFile    : ${t.sourceFile}`);
    console.log(`   updatedAt     : ${t.updatedAt.toISOString()}`);
  }

  console.log("\n========================================================");
  console.log(`\nรวม: ${trainings.length} certification(s)\n`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
