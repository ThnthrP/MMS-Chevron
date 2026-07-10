// ════════════════════════════════════════════════════════════════
// fixPositionsAssFlooOperator.js
// เช็ค/แก้ Employee.positionId ของ 12 คนใน sheet "Record" ให้ตรงกับ
// Position column (D) ของแต่ละคน — เผื่อบางคนยังชี้ไปตำแหน่งเก่า
// ("Assistance Floor Operator") ที่ไม่ได้ถูกแก้ตอนก่อนหน้า
//
//   node scripts/chevron/fixPositionsAssFlooOperator.js            → DRY-RUN
//   node scripts/chevron/fixPositionsAssFlooOperator.js --apply    → เขียนจริง
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

// Record sheet เขียนตำแหน่งว่า "Assistant Floor Operators Level X" อยู่แล้ว
// (ตรงกับ DB เป๊ะ ไม่ต้อง alias) — แต่เผื่อเจอสะกดเพี้ยนแบบเดียวกับ Matrix sheet
// (ขาด s ที่ Operator) ใส่ alias กันไว้ด้วย
const POSITION_ALIASES = {
  "Assistant Floor Operator Level 1": "Assistant Floor Operators Level 1",
  "Assistant Floor Operator Level 2": "Assistant Floor Operators Level 2",
  "Assistant Floor Operator Level 3": "Assistant Floor Operators Level 3",
};

const norm = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

function normalizePosition(value) {
  const name = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  return POSITION_ALIASES[name] || name;
}

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

  // ── lookup employee ──
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      fullName: true,
      fullNameEN: true,
      fullNameTH: true,
      positionId: true,
      position: { select: { name: true } },
    },
  });
  const byNorm = new Map();
  for (const e of employees) {
    for (const nm of [e.fullNameEN, e.fullNameTH, e.fullName]) {
      const k = norm(nm);
      if (k && !byNorm.has(k)) byNorm.set(k, e);
    }
  }

  // ── lookup position ──
  const positions = await prisma.position.findMany({
    select: { id: true, name: true },
  });
  const posByNorm = new Map();
  for (const p of positions) posByNorm.set(norm(p.name), p);

  const toUpdate = [];
  const alreadyCorrect = [];
  const notFoundEmployee = [];
  const notFoundPosition = [];

  for (
    let rowIndex = ROW.EMPLOYEE_START;
    rowIndex <= ROW.EMPLOYEE_END;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) continue;

    const fullNameEN = String(row[COL.FULL_NAME_EN] ?? "").trim();
    const fullNameTH = String(row[COL.FULL_NAME_TH] ?? "").trim();
    const positionRaw = String(row[COL.POSITION] ?? "").trim();

    if (!fullNameEN && !fullNameTH) continue;

    const emp = byNorm.get(norm(fullNameEN)) || byNorm.get(norm(fullNameTH));

    if (!emp) {
      notFoundEmployee.push({
        row: rowIndex + 1,
        name: fullNameTH || fullNameEN,
      });
      continue;
    }

    const correctPositionName = normalizePosition(positionRaw);
    const correctPosition = posByNorm.get(norm(correctPositionName));

    if (!correctPosition) {
      notFoundPosition.push({
        row: rowIndex + 1,
        name: fullNameTH || fullNameEN,
        positionRaw,
      });
      continue;
    }

    if (emp.positionId === correctPosition.id) {
      alreadyCorrect.push({
        row: rowIndex + 1,
        name: fullNameTH || fullNameEN,
        position: correctPosition.name,
      });
    } else {
      toUpdate.push({
        row: rowIndex + 1,
        name: fullNameTH || fullNameEN,
        empId: emp.id,
        currentPosition: emp.position?.name || "(none)",
        correctPositionId: correctPosition.id,
        correctPositionName: correctPosition.name,
      });
    }
  }

  console.log("========== SUMMARY ==========");
  console.log("ถูกต้องอยู่แล้ว     :", alreadyCorrect.length);
  console.log("ต้องแก้             :", toUpdate.length);
  console.log("ไม่พบ employee      :", notFoundEmployee.length);
  console.log("ไม่พบ position      :", notFoundPosition.length);

  if (toUpdate.length) {
    console.log("\n===== ต้องแก้ =====");
    for (const u of toUpdate) {
      console.log(
        `  row ${u.row}  "${u.name}"  "${u.currentPosition}"  →  "${u.correctPositionName}"`,
      );
    }
  }

  if (notFoundPosition.length) {
    console.log(
      "\n⚠ Position not found (เช็คว่ามีชื่อนี้ใน Manage Positions หรือยัง):",
    );
    for (const p of notFoundPosition) {
      console.log(`  row ${p.row}  "${p.name}"  [${p.positionRaw}]`);
    }
  }

  if (!APPLY) {
    console.log(
      "\n💡 DRY-RUN — ยังไม่เขียน DB. ถ้าผลโอเค รันใหม่ด้วย --apply\n",
    );
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  for (const u of toUpdate) {
    await prisma.employee.update({
      where: { id: u.empId },
      data: { positionId: u.correctPositionId },
    });
    updated++;
  }

  console.log("\n========== DONE ==========");
  console.log("Updated :", updated, "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
