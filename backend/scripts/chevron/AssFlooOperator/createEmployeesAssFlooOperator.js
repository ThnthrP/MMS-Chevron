// ════════════════════════════════════════════════════════════════
// createEmployeesAssFlooOperator.js
// สร้าง Employee ที่ยังไม่มีใน DB จาก sheet "Record" ของ
// Employee Training Offshore Chevron Ass.Floo Operator.31-3-2026-CLEAN.xlsx
//
// ใช้กับคนที่ checkEmployeesAssFlooOperator.js รายงานว่า "NOT MATCHED" เท่านั้น
// (คนที่ matched แล้วจะไม่ถูกแตะ/ไม่ถูกสร้างซ้ำ)
//
// Field convention เดียวกับที่ importRoster.js ใช้ตอน create ใหม่:
//   empCode: EXPT-XXX (running number ต่อจากตัวสูงสุดใน DB)
//   status: "active", availabilityStatus: "available",
//   mobilizationStatus: "pending", isOffshore: true
//   positionId: match จากคอลัมน์ Position ในชีต (ต้องมี Position
//   "Assistant Floor Operators Level 1/2/3" อยู่ใน DB ก่อนแล้ว)
//
//   node scripts/chevron/createEmployeesAssFlooOperator.js            → DRY-RUN
//   node scripts/chevron/createEmployeesAssFlooOperator.js --apply    → เขียนจริง
// ════════════════════════════════════════════════════════════════

import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE_PATH = path.join(
  __dirname,
  "../../../training_record_from_hr/clean/Employee Training Offshore Chevron Ass.Floo Operator.31-3-2026-CLEAN.xlsx",
);

const SHEET_NAME = "Record";

const COL = {
  FULL_NAME_EN: 1, // B
  FULL_NAME_TH: 2, // C
  POSITION: 3, // D
};

const ROW = {
  EMPLOYEE_START: 6, // row 7
  EMPLOYEE_END: 17, // row 18
};

const APPLY = process.argv.includes("--apply");

const norm = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const cleanName = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ");

async function main() {
  console.log(
    `\n🔧 MODE: ${APPLY ? "APPLY (เขียน DB)" : "DRY-RUN (ไม่เขียน)"}\n`,
  );

  const workbook = xlsx.readFile(FILE_PATH, { cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  // ── lookup employee ที่มีอยู่แล้ว (กันสร้างซ้ำ) ──
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      fullName: true,
      fullNameEN: true,
      fullNameTH: true,
      empCode: true,
    },
  });
  const byNorm = new Set();
  for (const e of employees) {
    for (const nm of [e.fullNameEN, e.fullNameTH, e.fullName]) {
      const k = norm(nm);
      if (k) byNorm.add(k);
    }
  }

  // ── lookup position ──
  const positions = await prisma.position.findMany({
    select: { id: true, name: true },
  });
  const posByNorm = new Map();
  for (const p of positions) posByNorm.set(norm(p.name), p);

  // ── empCode generator ──
  let maxCode = 0;
  for (const e of employees) {
    const m = /^EXPT-(\d+)$/.exec(e.empCode || "");
    if (m) maxCode = Math.max(maxCode, +m[1]);
  }
  const nextCode = () => `EXPT-${String(++maxCode).padStart(3, "0")}`;

  const toCreate = [];
  const alreadyExists = [];
  const posNotFound = [];

  for (
    let rowIndex = ROW.EMPLOYEE_START;
    rowIndex <= ROW.EMPLOYEE_END;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) continue;

    const fullNameEN = String(row[COL.FULL_NAME_EN] ?? "").trim();
    const fullNameTH = String(row[COL.FULL_NAME_TH] ?? "").trim();
    const positionName = String(row[COL.POSITION] ?? "").trim();

    if (!fullNameEN && !fullNameTH) continue;

    const key = norm(fullNameEN) || norm(fullNameTH);
    if (byNorm.has(key)) {
      alreadyExists.push({ row: rowIndex + 1, name: fullNameTH || fullNameEN });
      continue;
    }

    let positionId = null;
    if (positionName) {
      const p = posByNorm.get(norm(positionName));
      if (p) positionId = p.id;
      else posNotFound.push(positionName);
    }

    toCreate.push({
      row: rowIndex + 1,
      fullNameEN,
      fullNameTH,
      positionName,
      positionId,
    });
  }

  console.log("========== SUMMARY ==========");
  console.log("มีอยู่แล้ว (skip)     :", alreadyExists.length);
  console.log("จะสร้างใหม่           :", toCreate.length);
  console.log("Position not found    :", posNotFound.length);

  if (toCreate.length) {
    console.log("\n===== จะสร้างใหม่ =====");
    for (const c of toCreate) {
      console.log(
        `  row ${c.row}  "${c.fullNameTH || c.fullNameEN}" (EN: ${c.fullNameEN})  [${c.positionName}]  positionId=${c.positionId ?? "NULL ⚠"}`,
      );
    }
  }

  if (posNotFound.length) {
    console.log(
      "\n⚠ Position not found (positionId จะเป็น NULL — สร้าง Position ให้ตรงชื่อก่อน):",
    );
    for (const p of [...new Set(posNotFound)]) console.log(`  "${p}"`);
  }

  if (!APPLY) {
    console.log(
      "\n💡 DRY-RUN — ยังไม่เขียน DB. ถ้าผลโอเค รันใหม่ด้วย --apply\n",
    );
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  for (const c of toCreate) {
    await prisma.employee.create({
      data: {
        empCode: nextCode(),
        fullName: cleanName(c.fullNameEN || c.fullNameTH), // ✅ EN เป็นหลัก ตรง convention เดียวกับ importRoster.js
        fullNameEN: cleanName(c.fullNameEN),
        fullNameTH: cleanName(c.fullNameTH) || null,
        status: "active",
        availabilityStatus: "available",
        mobilizationStatus: "pending",
        isOffshore: true,
        positionId: c.positionId,
      },
    });
    created++;
  }

  console.log("\n========== DONE ==========");
  console.log("Created :", created);
  console.log(
    "\n→ รัน checkEmployeesAssFlooOperator.js อีกครั้งเพื่อยืนยันว่าครบ 12/12 แล้ว\n",
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
