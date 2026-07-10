// ════════════════════════════════════════════════════════════════
// cleanupDemoSeedAssFlooOperator.js
// ลบ EmployeeTraining ที่เป็น source:"demo_seed" ของ 12 คน Assist Floor
// Operator เฉพาะ training ที่ "ไม่ได้" อยู่ใน 50-training scope ของ
// ตำแหน่งนี้ (เช่น Operator Knowledge (C1 level), HAZMAT ฯลฯ ที่เป็น
// training ของตำแหน่งอื่นจากไฟล์ Chevron หลัก ไม่เกี่ยวกับ position ปัจจุบัน)
//
// หา 12 คนอัตโนมัติจาก employeeId ที่มี EmployeeTraining record
// source:"excel_import" + sourceFile ตรงกับไฟล์ Assist Floor Operator
//
//   node scripts/chevron/cleanupDemoSeedAssFlooOperator.js            → DRY-RUN
//   node scripts/chevron/cleanupDemoSeedAssFlooOperator.js --apply    → ลบจริง
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

// 50 training canonical name ที่อยู่ในสโคปของ Assist Floor Operator
// (ต้องตรงกับที่เพิ่มไว้ใน seedGlobalTrainings.js + mapping ทั้งหมด)
const SCOPE_TRAINING_NAMES = [
  // Exact match
  "Mech for Maintenance",
  "IE for Maintenance",
  "MS Office",
  "Advanced First Aid Training",
  "MSW Process Overview",
  "Bypassing Critical Protection (BCP)",
  "Hot Work Standard",
  "HazCom",
  "SIMOPs",
  "Confined Space Entry Standard",
  // Renamed (canonical)
  "Basic IE (Pneumatic)",
  "Basic Mech (Fitting)",
  "T-BOSIET",
  "Permit to Work Procedure",
  "Safety Orientation - Incident Reporting, BBS, HazOb, SWC",
  "Electrical Standard",
  "Isolation of Hazardous Energy (IHE)",
  "Lifting and Rigging Standard",
  "Working At Height Standard",
  "Hazard Analysis Procedure",
  "Fire Watch",
  "Qualified Gas Tester (QGT)",
  // New
  "Oil&Gas operation knowledge",
  "English skills (Basic Reading / Writing)",
  "CPP Process Overview",
  "CPP Power System and Utility system",
  "LQ and Utility system",
  "Fire and gas detection and Suppression system",
  "Fire and Gas Detection and Suppression System",
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
  "Christmas Tree",
  "Basis Offshore Safety Training (BOST)",
  "Tropical Further Offshore Emergency Training (T-FOET)",
  "Offshore Emergency Response Team Member (ERTM)",
  "Area Controller (BCP)",
  "H2S Awaness Level 1",
  "H2S Awaness Level 2",
];

async function main() {
  console.log(`\n🔧 MODE: ${APPLY ? "APPLY (ลบจริง)" : "DRY-RUN (ไม่ลบ)"}\n`);
  console.log(`สโคป training ทั้งหมด: ${SCOPE_TRAINING_NAMES.length} ตัว\n`);

  // ── หา 12 คน จาก record excel_import ของไฟล์นี้ ──
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

  // ── หา demo_seed record ของ 12 คนนี้ ที่ globalTraining ไม่อยู่ในสโคป ──
  const toDelete = await prisma.employeeTraining.findMany({
    where: {
      employeeId: { in: employeeIds },
      source: "demo_seed",
      isLatest: true,
      globalTraining: {
        name: { notIn: SCOPE_TRAINING_NAMES },
      },
    },
    include: {
      employee: { select: { fullName: true, fullNameEN: true } },
      globalTraining: { select: { name: true } },
    },
    orderBy: [{ employeeId: "asc" }],
  });

  console.log("========== SUMMARY ==========");
  console.log(`demo_seed record นอกสโคป (จะลบ): ${toDelete.length}\n`);

  const byEmployee = new Map();
  for (const r of toDelete) {
    const key = r.employee.fullNameEN || r.employee.fullName;
    if (!byEmployee.has(key)) byEmployee.set(key, []);
    byEmployee.get(key).push(r.globalTraining.name);
  }

  for (const [name, trainings] of byEmployee) {
    console.log(`  ${name}:`);
    for (const t of trainings) console.log(`    - ${t}`);
  }

  if (toDelete.length === 0) {
    console.log("\n✅ ไม่มี demo_seed นอกสโคปให้ลบ\n");
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
