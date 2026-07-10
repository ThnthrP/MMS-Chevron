// ════════════════════════════════════════════════════════════════
// debugRowAssFlooOperator.js
// เช็คว่า COL/ROW config อ่านค่าตรงกับที่ควรเป็นไหม สำหรับ 1 คน
// (อ่านอย่างเดียว ไม่เขียน DB, ไม่ต่อ prisma เลย — เช็คแค่การอ่าน Excel)
//
//   node scripts/chevron/debugRowAssFlooOperator.js            → row 7 (Pison Katnak) default
//   node scripts/chevron/debugRowAssFlooOperator.js 10         → row 10 (Woraphong Srithong)
// ════════════════════════════════════════════════════════════════

import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";

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

  MEDICAL_HOSP: 5, // F
  MEDICAL_ISSUE: 6, // G
  MEDICAL_EXP: 7, // H

  COVID_VACCINE: 10, // K

  PDPA_CONSENT: 11, // L

  TRAINING_START: 12, // M
};

const ROW = {
  TRAINING_NAME: 3, // row 4
  TRAINING_FIELD: 5, // row 6

  EMPLOYEE_START: 6, // row 7
  EMPLOYEE_END: 17, // row 18
};

const targetRowNumber = Number(process.argv[2]) || 7; // Excel row number (1-indexed)
const targetRowIndex = targetRowNumber - 1; // 0-indexed สำหรับ array
const startColOffset = Number(process.argv[3]) || 0; // เลื่อนจุดเริ่มดูคอลัมน์ (0 = เริ่มที่ TRAINING_START ปกติ)
const rangeWidth = Number(process.argv[4]) || 20; // จำนวนคอลัมน์ที่จะแสดง

function colLetter(idx) {
  // แปลง 0-indexed column number กลับเป็นตัวอักษรคอลัมน์ (0=A, 12=M, 13=N, ...)
  let s = "";
  let n = idx;
  do {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function main() {
  const workbook = xlsx.readFile(FILE_PATH, {
    cellDates: true,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  const row = rows[targetRowIndex];
  if (!row) {
    console.log(`⚠ ไม่พบแถวที่ ${targetRowNumber} ในไฟล์`);
    return;
  }

  console.log(
    `\n========== ตรวจสอบแถว Excel row ${targetRowNumber} (คอลัมน์ ${colLetter(COL.TRAINING_START + startColOffset)} ถึง ${colLetter(Math.min(COL.TRAINING_START + startColOffset + rangeWidth, row.length) - 1)}) ==========\n`,
  );

  console.log("--- Employee Info ---");
  console.log(
    `  FULL_NAME_EN  [col ${colLetter(COL.FULL_NAME_EN)}] = ${JSON.stringify(row[COL.FULL_NAME_EN])}`,
  );
  console.log(
    `  FULL_NAME_TH  [col ${colLetter(COL.FULL_NAME_TH)}] = ${JSON.stringify(row[COL.FULL_NAME_TH])}`,
  );
  console.log(
    `  POSITION      [col ${colLetter(COL.POSITION)}] = ${JSON.stringify(row[COL.POSITION])}`,
  );

  console.log("\n--- Medical ---");
  console.log(
    `  MEDICAL_HOSP  [col ${colLetter(COL.MEDICAL_HOSP)}] = ${JSON.stringify(row[COL.MEDICAL_HOSP])}`,
  );
  console.log(
    `  MEDICAL_ISSUE [col ${colLetter(COL.MEDICAL_ISSUE)}] = ${JSON.stringify(row[COL.MEDICAL_ISSUE])}`,
  );
  console.log(
    `  MEDICAL_EXP   [col ${colLetter(COL.MEDICAL_EXP)}] = ${JSON.stringify(row[COL.MEDICAL_EXP])}`,
  );

  console.log("\n--- Covid / PDPA ---");
  console.log(
    `  COVID_VACCINE [col ${colLetter(COL.COVID_VACCINE)}] = ${JSON.stringify(row[COL.COVID_VACCINE])}`,
  );
  console.log(
    `  PDPA_CONSENT  [col ${colLetter(COL.PDPA_CONSENT)}] = ${JSON.stringify(row[COL.PDPA_CONSENT])}`,
  );

  console.log("\n--- Training columns ---");
  const headerRow = rows[ROW.TRAINING_NAME];
  const fieldRow = rows[ROW.TRAINING_FIELD];

  const startCol = COL.TRAINING_START + startColOffset;
  const limit = Math.min(startCol + rangeWidth, row.length);
  for (let col = startCol; col < limit; col++) {
    const trainingName = headerRow[col];
    const fieldName = fieldRow[col];
    const value = row[col];
    console.log(
      `  [col ${colLetter(col)}]  training="${trainingName ?? ""}"  field="${fieldName ?? ""}"  value=${JSON.stringify(value)}`,
    );
  }

  console.log(
    "\n💡 เทียบกับที่เห็นในภาพ Excel (Name Box) ว่าตรงกันไหม — โดยเฉพาะ FULL_NAME_EN/TH และ training คอลัมน์แรกๆ\n",
  );
}

main();
