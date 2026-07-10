// ════════════════════════════════════════════════════════════════
// debugOrphanedAssignments.js
// เช็คว่า Assignment ของ project นี้ มีตัวไหนที่ employeeId ชี้ไปหา
// Employee ที่ถูกลบไปแล้วหรือไม่ (ต้นเหตุที่เป็นไปได้ของ 500 error
// ตอนเปิด GET /api/projects/:id)
//
// อ่านอย่างเดียว ไม่เขียน DB
//
//   node scripts/debugOrphanedAssignments.js b55377ae-209c-444f-9539-0833797645d4
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const projectId = process.argv[2];

if (!projectId) {
  console.log("ใช้: node scripts/debugOrphanedAssignments.js <projectId>");
  process.exit(1);
}

async function main() {
  const assignments = await prisma.assignment.findMany({
    where: { projectId },
  });

  console.log(`\n🔍 Project: ${projectId}`);
  console.log(
    `   Assignment ทั้งหมดที่ผูกกับ project นี้: ${assignments.length}\n`,
  );

  if (assignments.length === 0) {
    console.log(
      "⚠ ไม่มี Assignment ผูกกับ project นี้เลย — ปัญหาอาจไม่ได้อยู่ที่ assignments",
    );
    await prisma.$disconnect();
    return;
  }

  const employeeIds = [...new Set(assignments.map((a) => a.employeeId))];

  const existingEmployees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, fullName: true },
  });
  const existingIds = new Set(existingEmployees.map((e) => e.id));

  const orphaned = assignments.filter((a) => !existingIds.has(a.employeeId));

  console.log("========== SUMMARY ==========");
  console.log(`Employee ที่อ้างถึงทั้งหมด : ${employeeIds.length}`);
  console.log(`Employee ที่ยังมีอยู่จริง   : ${existingIds.size}`);
  console.log(`Assignment ที่ orphaned    : ${orphaned.length}`);

  if (orphaned.length > 0) {
    console.log(
      "\n===== ORPHANED (employeeId ไม่มีใน Employee table แล้ว) =====",
    );
    for (const a of orphaned) {
      console.log(
        `  Assignment.id=${a.id}  employeeId=${a.employeeId}  platform=${a.platform}  status=${a.status}`,
      );
    }
    console.log(
      "\n💡 นี่คือสาเหตุของ 500 error — Prisma include employee (required relation) ไม่เจอ record จะ throw",
    );
  } else {
    console.log(
      "\n✅ ไม่มี orphaned assignment — ต้นเหตุ 500 อาจไม่ได้อยู่ตรงนี้ ต้องดู stack trace จริงจาก log",
    );
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
