// ════════════════════════════════════════════════════════════════
// resetEmployeeTrainingsAssFlooOperator.js
// ลบ EmployeeTraining record ทั้งหมดที่ถูกสร้างโดย
// importEmployeeTrainings_AssFlooOperator.js เท่านั้น (กรองด้วย
// sourceFile ให้ตรงเป๊ะ) — ไม่แตะ record จากไฟล์ Chevron หลักเลย
// แม้ globalTrainingId จะซ้ำกัน (เช่น Basic IE (Pneumatic), MS Office)
//
// ใช้ก่อนรัน import ใหม่ เพื่อให้ทุก record เริ่มจาก version:1 สดๆ
// แทนที่จะพึ่ง logic "correction" (mark isLatest:false + สร้างใหม่)
// ซึ่งมี edge case ที่อาจหลุดได้ถ้า state เดิมสับสน
//
//   node scripts/chevron/resetEmployeeTrainingsAssFlooOperator.js            → DRY-RUN
//   node scripts/chevron/resetEmployeeTrainingsAssFlooOperator.js --apply    → ลบจริง
// ════════════════════════════════════════════════════════════════

import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ต้องตรงเป๊ะกับ FILE_PATH ใน importEmployeeTrainings_AssFlooOperator.js
const FILE_PATH = path.join(
  __dirname,
  "../../../training_record_from_hr/clean/Employee Training Offshore Chevron Ass.Floo Operator.31-3-2026-CLEAN.xlsx",
);

const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`\n🔧 MODE: ${APPLY ? "APPLY (ลบจริง)" : "DRY-RUN (ไม่ลบ)"}\n`);
  console.log(`ค้นหา record ที่ sourceFile = "${FILE_PATH}"\n`);

  const records = await prisma.employeeTraining.findMany({
    where: { sourceFile: FILE_PATH },
    include: {
      employee: { select: { fullName: true, fullNameEN: true } },
      globalTraining: { select: { name: true } },
    },
    orderBy: [{ employeeId: "asc" }, { createdAt: "asc" }],
  });

  console.log("========== SUMMARY ==========");
  console.log("พบ record ทั้งหมด (ทุก version) :", records.length);

  const byEmployee = new Map();
  for (const r of records) {
    const key = r.employee.fullNameEN || r.employee.fullName;
    byEmployee.set(key, (byEmployee.get(key) || 0) + 1);
  }

  console.log(`จำนวนพนักงานที่มี record นี้     : ${byEmployee.size}`);
  console.log("\n===== แยกตามคน =====");
  for (const [name, count] of byEmployee) {
    console.log(`  ${name}: ${count} records`);
  }

  if (records.length === 0) {
    console.log("\n✅ ไม่มี record ให้ลบ — ไม่ต้องทำอะไรเพิ่ม\n");
    await prisma.$disconnect();
    return;
  }

  if (!APPLY) {
    console.log(
      "\n💡 DRY-RUN — ยังไม่ลบอะไร ถ้าตัวเลขดูสมเหตุสมผล (ตรงกับ 12 คน x ~50 training) รันใหม่ด้วย --apply\n",
    );
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.employeeTraining.deleteMany({
    where: { sourceFile: FILE_PATH },
  });

  console.log("\n========== DONE ==========");
  console.log("ลบไปแล้ว :", result.count, "records");
  console.log(
    "\n→ ตอนนี้รัน node scripts/chevron/importEmployeeTrainings_AssFlooOperator.js ใหม่ได้เลย ทุก record จะเริ่มจาก version:1 สดๆ\n",
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
