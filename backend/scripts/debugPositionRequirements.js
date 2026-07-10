// ════════════════════════════════════════════════════════════════
// debugPositionRequirements.js
// เช็ค Employee.positionId ตรงๆ ว่าชี้ไปตำแหน่งไหน แล้วดูว่าตำแหน่งนั้น
// มี PositionRequirement กี่แถวจริง (แยกตาม requirementType)
// ใช้เพื่อ debug ปัญหา Compliance Dashboard vs Gap Modal ตัวเลขไม่ตรงกัน
//
// อ่านอย่างเดียว ไม่เขียน DB
//
//   node scripts/debugPositionRequirements.js "Nikorn Manget"
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const searchName = process.argv[2];

if (!searchName) {
  console.log('ใช้: node scripts/debugPositionRequirements.js "ชื่อพนักงาน"');
  process.exit(1);
}

async function main() {
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { fullName: { contains: searchName, mode: "insensitive" } },
        { fullNameEN: { contains: searchName, mode: "insensitive" } },
      ],
    },
    include: { position: true },
  });

  if (!employee) {
    console.log(`⚠ ไม่พบพนักงานชื่อ "${searchName}"`);
    await prisma.$disconnect();
    return;
  }

  console.log(
    `\n👤 ${employee.fullNameEN || employee.fullName}  (empCode: ${employee.empCode})`,
  );
  console.log(`   employee.positionId : ${employee.positionId}`);
  console.log(
    `   position.name       : ${employee.position?.name ?? "⚠ NULL — ไม่มี position เลย"}\n`,
  );

  if (!employee.positionId) {
    console.log(
      "⚠ Employee นี้ไม่มี positionId เลย — นี่คือสาเหตุที่ requirement = 0 แน่นอน\n",
    );
    await prisma.$disconnect();
    return;
  }

  // เช็คว่ามี Position ชื่อซ้ำกันหลาย record ไหม (สาเหตุคลาสสิกของปัญหานี้)
  const samePositionName = employee.position
    ? await prisma.position.findMany({
        where: { name: employee.position.name },
      })
    : [];

  if (samePositionName.length > 1) {
    console.log(
      `⚠ พบ Position ชื่อ "${employee.position.name}" ซ้ำกัน ${samePositionName.length} record! (id ต่างกัน)`,
    );
    for (const p of samePositionName) {
      console.log(
        `   - id: ${p.id}  ${p.id === employee.positionId ? "← employee นี้ใช้ตัวนี้" : ""}`,
      );
    }
    console.log("");
  }

  const requirements = await prisma.positionRequirement.findMany({
    where: { positionId: employee.positionId },
    include: {
      clientTraining: {
        include: {
          globalTraining: { select: { name: true } },
          contract: { include: { client: { select: { name: true } } } },
        },
      },
    },
  });

  console.log(
    `📋 PositionRequirement ทั้งหมดของ positionId นี้: ${requirements.length}\n`,
  );

  const byType = new Map();
  for (const r of requirements) {
    const key = r.requirementType;
    byType.set(key, (byType.get(key) || 0) + 1);
  }
  console.log("แยกตาม requirementType:");
  for (const [type, count] of byType) {
    console.log(`   ${type}: ${count}`);
  }

  if (requirements.length === 0 && samePositionName.length > 1) {
    console.log(
      `\n💡 เดาสาเหตุ: employee ชี้ไปที่ Position id ที่ไม่มี requirement ผูกอยู่ (id ผิดตัว) ในขณะที่ Position ชื่อเดียวกันอีก record หนึ่งมี requirement ครบ — น่าจะเป็น Position ซ้ำที่เกิดจากการสร้างซ้ำ (duplicate) ตอนไหนสักครั้ง`,
    );
  }

  console.log("\n========================================================\n");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
