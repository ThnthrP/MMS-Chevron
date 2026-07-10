// ════════════════════════════════════════════════════════════════
// checkEmployeesAssFlooOperator.js
// อ่าน sheet "Record" ของ Employee Training Offshore Chevron
// Ass.Floo Operator.31-3-2026-CLEAN.xlsx → เช็คว่า employee ทั้ง 12 คน
// มีอยู่ใน DB แล้วหรือยัง (match ด้วยชื่อ, ตรรกะเดียวกับ importRosterAssignment.js)
//
// อ่านอย่างเดียว — ไม่เขียน DB, ไม่มี flag --apply
//
//   node scripts/chevron/checkEmployeesAssFlooOperator.js
// ════════════════════════════════════════════════════════════════

import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ปรับ depth ให้ตรงตำแหน่งไฟล์จริงของสคริปต์นี้ (เทียบกับ scripts/chevron/)
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

const norm = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

async function main() {
  console.log("🔍 เช็ครายชื่อ employee (อ่านอย่างเดียว ไม่เขียน DB)\n");

  const workbook = xlsx.readFile(FILE_PATH, { cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  // ── โหลด employee ทั้งหมดจาก DB มาทำ lookup map (เหมือน importRosterAssignment.js) ──
  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, fullNameEN: true, fullNameTH: true },
  });
  const byNorm = new Map();
  for (const e of employees) {
    for (const nm of [e.fullNameEN, e.fullNameTH, e.fullName]) {
      const k = norm(nm);
      if (k && !byNorm.has(k)) byNorm.set(k, e);
    }
  }

  const matched = [];
  const notMatched = [];

  for (
    let rowIndex = ROW.EMPLOYEE_START;
    rowIndex <= ROW.EMPLOYEE_END;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) continue;

    const fullNameEN = String(row[COL.FULL_NAME_EN] ?? "").trim();
    const fullNameTH = String(row[COL.FULL_NAME_TH] ?? "").trim();
    const positionInSheet = String(row[COL.POSITION] ?? "").trim();

    if (!fullNameEN && !fullNameTH) continue;

    const emp = byNorm.get(norm(fullNameEN)) || byNorm.get(norm(fullNameTH));

    if (emp) {
      matched.push({
        row: rowIndex + 1,
        sheetName: fullNameTH || fullNameEN,
        dbName: emp.fullNameTH || emp.fullNameEN || emp.fullName,
        positionInSheet,
      });
    } else {
      notMatched.push({
        row: rowIndex + 1,
        sheetName: fullNameTH || fullNameEN,
        positionInSheet,
      });
    }
  }

  console.log("========== SUMMARY ==========");
  console.log("รวมแถวที่เช็ค      :", matched.length + notMatched.length);
  console.log("เจอใน DB (matched) :", matched.length);
  console.log("ไม่เจอ (not found) :", notMatched.length);

  if (matched.length) {
    console.log(
      "\n===== MATCHED (พร้อมรัน importEmployeeTrainings_AssFlooOperator.js) =====",
    );
    for (const m of matched) {
      console.log(
        `  row ${m.row}  "${m.sheetName}"  →  DB: "${m.dbName}"  [${m.positionInSheet}]`,
      );
    }
  }

  if (notMatched.length) {
    console.log(
      "\n===== NOT MATCHED (ต้องเช็คก่อน — สะกดต่าง? ยังไม่มีใน DB? รัน importRoster.js ครบหรือยัง?) =====",
    );
    for (const n of notMatched) {
      console.log(`  row ${n.row}  "${n.sheetName}"  [${n.positionInSheet}]`);
    }
    console.log(
      "\n⚠ ถ้ามีรายการ NOT MATCHED — importEmployeeTrainings_AssFlooOperator.js จะข้าม (skip) คนเหล่านี้ไปเงียบๆ",
    );
  } else {
    console.log(
      "\n✅ ครบทุกคน — พร้อมรัน importEmployeeTrainings_AssFlooOperator.js ได้เลย",
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
