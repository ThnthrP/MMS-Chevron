// ════════════════════════════════════════════════════════════════
// cleanupDemoSeedByGlobalTraining.js
// ลบ EmployeeTraining ที่เป็น source:"demo_seed" ของ "ทุกคน" (ไม่จำกัด
// แค่ 12 คน Assist Floor Operator) เฉพาะ training ที่ระบุในลิสต์ด้านล่าง
//
// ใช้ได้อย่างปลอดภัยเฉพาะ training ที่ "ไม่มีทางมีใครมีข้อมูลจริงอื่น
// นอกจาก demo_seed" เท่านั้น (เช่น training ที่เพิ่งสร้างใหม่ ไม่เคยมีใน
// ไฟล์ Chevron หลักมาก่อน) — ห้ามใช้กับ training ที่ใช้ร่วมกับตำแหน่งอื่น
// (เช่น SIMOPs, HazCom, Bypassing Critical Protection (BCP)) เพราะอาจ
// ลบข้อมูลจริงของพนักงานคนอื่นที่ไม่เกี่ยวกับ Assist Floor Operator ไปด้วย
//
//   node scripts/chevron/cleanupDemoSeedByGlobalTraining.js            → DRY-RUN
//   node scripts/chevron/cleanupDemoSeedByGlobalTraining.js --apply    → ลบจริง
// ════════════════════════════════════════════════════════════════

import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE_PATH = path.join(
  __dirname,
  "../../../training_record_from_hr/clean/Employee Training Offshore Chevron Ass.Floo Operator.31-3-2026-CLEAN.xlsx",
);

const APPLY = process.argv.includes("--apply");

// รายชื่อ training ที่ยืนยันแล้วว่าปลอดภัย — ไม่มีตำแหน่งอื่นใช้ร่วม
const TARGET_TRAINING_NAMES = [
  "Oil&Gas operation knowledge",
  "Basic IE (Pneumatic)",
  "Basic Mech (Fitting)",
  "Mech for Maintenance",
  "IE for Maintenance",
  "English skills (Basic Reading / Writing)",
  "MS Office",
  "CPP Process Overview",
  "CPP Power System and Utility system",
  "LQ and Utility system",
  "Fire and gas detection and Suppression system",
  "Operational Capability and General",
  "Control system & Instrument",
  "Routine Lab work",
  "ODR & GVI all complexes",
  "Safety & Lifesaving equipment inspection",
  "Wellhead Platform fundamental",
  "ORDC remote P/F via SCADA",
  "Well test via SCADA",
  "Well B/D via SCADA",
  "BC Operation & Control",
  "Monitor well integrity (PSM)",
  "Chemical injection Control & Monitoring",
  "SCADA system Operation & Control",
  "Process Safety Management Technical Safety",
  "Fire and Gas Detection and Suppression System",
  "Christmas Tree",
  "Basis Offshore Safety Training (BOST)",
  "Safety Orientation - Incident Reporting, BBS, HazOb, SWC",
  "H2S Awaness Level 1",
  "Fire Watch",
];

async function main() {
  console.log(`\n🔧 MODE: ${APPLY ? "APPLY (ลบจริง)" : "DRY-RUN (ไม่ลบ)"}\n`);
  console.log(`training ที่จะเช็ค: ${TARGET_TRAINING_NAMES.length} ตัว\n`);

  // ⚠ จำกัดสโคปแค่ 12 คน Assist Floor Operator เท่านั้น (หาอัตโนมัติจาก
  // employeeId ที่มี record excel_import ผูกกับไฟล์นี้) — ไม่แตะพนักงาน
  // คนอื่นในระบบเลย แม้ training พวกนี้จะไม่มีใครใช้จริงนอกจาก 12 คนนี้ก็ตาม
  const scopedRecords = await prisma.employeeTraining.findMany({
    where: { sourceFile: FILE_PATH },
    select: { employeeId: true },
    distinct: ["employeeId"],
  });
  const employeeIds = scopedRecords.map((r) => r.employeeId);
  console.log(
    `พบพนักงานในสโคป Assist Floor Operator: ${employeeIds.length} คน\n`,
  );

  if (employeeIds.length === 0) {
    console.log(
      "⚠ ไม่พบพนักงานเลย — เช็คว่ารัน importEmployeeTrainings_AssFlooOperator.js แล้วหรือยัง",
    );
    await prisma.$disconnect();
    return;
  }

  const toDelete = await prisma.employeeTraining.findMany({
    where: {
      employeeId: { in: employeeIds },
      source: "demo_seed",
      isLatest: true,
      globalTraining: {
        name: { in: TARGET_TRAINING_NAMES },
      },
    },
    include: {
      employee: { select: { fullName: true, fullNameEN: true } },
      globalTraining: { select: { name: true } },
    },
    orderBy: [{ employeeId: "asc" }],
  });

  console.log("========== SUMMARY ==========");
  console.log(`demo_seed record ที่ตรงเงื่อนไข (จะลบ): ${toDelete.length}\n`);

  const byTraining = new Map();
  for (const r of toDelete) {
    const key = r.globalTraining.name;
    byTraining.set(key, (byTraining.get(key) || 0) + 1);
  }

  console.log("===== แยกตาม training =====");
  for (const [name, count] of byTraining) {
    console.log(`  ${name}: ${count} คน`);
  }

  const byEmployee = new Map();
  for (const r of toDelete) {
    const key = r.employee.fullNameEN || r.employee.fullName;
    byEmployee.set(key, (byEmployee.get(key) || 0) + 1);
  }
  console.log(`\nจำนวนพนักงานที่ได้รับผลกระทบทั้งหมด: ${byEmployee.size} คน`);

  if (toDelete.length === 0) {
    console.log("\n✅ ไม่มี demo_seed ที่ตรงเงื่อนไขให้ลบ\n");
    await prisma.$disconnect();
    return;
  }

  if (!APPLY) {
    console.log(
      "\n💡 DRY-RUN — ยังไม่ลบอะไร ถ้ารายการดูถูกต้อง รันใหม่ด้วย --apply\n",
    );
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.employeeTraining.deleteMany({
    where: { id: { in: toDelete.map((r) => r.id) } },
  });

  console.log("\n========== DONE ==========");
  console.log("ลบไปแล้ว :", result.count, "records\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
