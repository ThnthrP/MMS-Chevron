// ============================================================
// scripts/chevron/importMedicalExamRecords.js
//
// Parses the "PE tracking" annual health-exam Excel and upserts
// MedicalExamRecord rows, keeping Employee.healthRisk in sync as
// a cache of the latest exam, and keeping the linked MedicalCheck
// (checkType = "Medical Check up") expiry in sync so the existing
// compliance/allocation expiry logic keeps working unchanged.
//
// USAGE:
//   node scripts/chevron/importMedicalExamRecords.js <path-to-xlsx> [options]
//
// OPTIONS:
//   --sheet="30-4-2026"   Worksheet name to read (default: first sheet)
//   --dry-run             Parse + match only, no writes. Prints a
//                          summary of what WOULD happen. Always run
//                          this first on a new file.
//
// COLUMN MAPPING (fixed by position, not by header text — headers in
// this file wrap across multiple lines and aren't reliable to parse):
//   A  ชื่อและนามสกุลภาษาไทย   → used for employee matching only
//   B  ชื่อภาษาอังกฤษ          → used for employee matching only
//   C  นามสกุลภาษาอังกฤษ       → used for employee matching only
//   J  โรคประจำตัว             → NOT in current schema. Appended into
//                                `note` (prefixed) so it isn't silently
//                                dropped. Flag for a future migration
//                                if this needs its own field.
//   K  วันที่ตรวจร่างกาย        → examDate
//   L..AG                     → see FIELD_MAP below
//   AH หมายเหตุ                → note
//   AI Health Risk             → healthRisk (enum-mapped)
//   AJ Recommendation          → recommendation
//   AK วันที่ลง Comment         → commentDate
//   AL/AM/AN/AO                → NOT stored (computed at runtime by
//                                utils/expiryStatus.js instead)
// ============================================================

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

// ── CLI args ──
const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const sheetArg = args.find((a) => a.startsWith("--sheet="));
const sheetName = sheetArg ? sheetArg.split("=")[1] : null;

if (!filePath) {
  console.error(
    'Usage: node scripts/chevron/importMedicalExamRecords.js <path-to-xlsx> [--sheet="name"] [--dry-run]',
  );
  process.exit(1);
}

// ── column letter → field name (single-value fields, straight copy) ──
const FIELD_MAP = {
  L: "height",
  M: "weight",
  N: "bmi",
  O: "bpSystolic",
  P: "bpDiastolic",
  Q: "hematocritPct",
  R: "urineResult",
  S: "urineAbnormalNote",
  T: "bloodSugar",
  U: "ldl",
  V: "triglyceride",
  W: "sgot",
  X: "sgpt",
  Y: "uricAcid",
  Z: "ekgResult",
  AA: "ekgAbnormalNote",
  AB: "chestXrayResult",
  AC: "chestXrayAbnormalNote",
  AD: "dentalResult",
  AE: "dentalAbnormalNote",
  AF: "estResult",
  AG: "estAbnormalNote",
};

const NUMERIC_FIELDS = new Set([
  "height",
  "weight",
  "bmi",
  "bpSystolic",
  "bpDiastolic",
  "hematocritPct",
  "bloodSugar",
  "ldl",
  "triglyceride",
  "sgot",
  "sgpt",
  "uricAcid",
]);
const INT_FIELDS = new Set(["bpSystolic", "bpDiastolic"]);

// ── helpers ──

function cellText(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && "result" in v)
    return String(v.result ?? "").trim() || null; // formula cell
  if (typeof v === "object" && "richText" in v) {
    return (
      v.richText
        .map((r) => r.text)
        .join("")
        .trim() || null
    );
  }
  const s = String(v).trim();
  return s === "" ? null : s;
}

function cellDate(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object" && v.result instanceof Date) return v.result;
  // fallback: try parsing as text (e.g. "27-May-2026")
  const s = cellText(cell);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function cellNumber(cell) {
  const s = cellText(cell);
  if (s === null) return null;
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function normalizeName(s) {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

// ผ่อนกฎเพิ่ม — ลบช่องว่างทั้งหมด (ไม่ใช่แค่ยุบซ้ำ) ใช้เป็น fallback
// เผื่อกรณี copy-paste ชื่อไทยจาก Excel มีช่องว่างแทรกกลางพยางค์แบบสุ่ม
// ยังเป็น exact-match string comparison เหมือนเดิม แค่ผ่อนกฎช่องว่าง
// ไม่ใช่ fuzzy matching ที่เสี่ยงจับคู่ผิดคน
function normalizeNameNoSpace(s) {
  return (s || "").replace(/\s+/g, "").trim().toLowerCase();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];

  if (!worksheet) {
    console.error(
      `Worksheet ${sheetName ? `"${sheetName}"` : "(first sheet)"} not found in ${filePath}`,
    );
    process.exit(1);
  }

  console.log(`Reading sheet "${worksheet.name}" (${worksheet.rowCount} rows)`);
  if (dryRun) console.log("── DRY RUN — no database writes will be made ──\n");

  // Preload all active employees once — matching is done in memory to
  // avoid N queries per row.
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      fullName: true,
      fullNameTH: true,
      fullNameEN: true,
    },
  });

  const byThaiName = new Map();
  const byThaiNameNoSpace = new Map(); // ← เพิ่มใหม่
  const byEnglishName = new Map();
  for (const e of employees) {
    if (e.fullNameTH) {
      byThaiName.set(normalizeName(e.fullNameTH), e);
      byThaiNameNoSpace.set(normalizeNameNoSpace(e.fullNameTH), e); // ← เพิ่ม
    }
    if (e.fullName) {
      byThaiName.set(normalizeName(e.fullName), e);
      byThaiNameNoSpace.set(normalizeNameNoSpace(e.fullName), e); // ← เพิ่ม
    }
    if (e.fullNameEN) byEnglishName.set(normalizeName(e.fullNameEN), e);
  }

  const matched = [];
  const unmatched = [];
  const skippedEmpty = [];
  const errors = [];

  let created = 0;
  let updated = 0;
  let skippedUnchanged = 0;

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const thaiName = cellText(row.getCell("A"));
    const engFirst = cellText(row.getCell("B"));
    const engLast = cellText(row.getCell("C"));

    if (!thaiName && !engFirst) {
      skippedEmpty.push(rowNum);
      continue;
    }

    // ── match employee ──
    let employee = null;
    if (thaiName) employee = byThaiName.get(normalizeName(thaiName)) || null;
    if (!employee && thaiName) {
      employee = byThaiNameNoSpace.get(normalizeNameNoSpace(thaiName)) || null; // ← เพิ่ม fallback
    }

    if (!employee && engFirst) {
      const fullEN = normalizeName(`${engFirst} ${engLast || ""}`);
      employee = byEnglishName.get(fullEN) || null;
    }

    if (!employee) {
      unmatched.push({ row: rowNum, thaiName, engFirst, engLast });
      continue;
    }

    try {
      // ── build field values ──
      const examDate = cellDate(row.getCell("K"));
      const fields = {};
      for (const [col, field] of Object.entries(FIELD_MAP)) {
        const cell = row.getCell(col);
        if (NUMERIC_FIELDS.has(field)) {
          const n = cellNumber(cell);
          fields[field] =
            n === null ? null : INT_FIELDS.has(field) ? Math.round(n) : n;
        } else {
          fields[field] = cellText(cell);
        }
      }

      const chronicDisease = cellText(row.getCell("J")); // โรคประจำตัว — เก็บ field แยกแล้ว เก็บดิบตามที่กรอกมา (รวม "ไม่มี (No)")
      const note = cellText(row.getCell("AH"));

      const healthRisk = cellText(row.getCell("AI")); // เก็บข้อความดิบตรงๆ — ไม่ map enum แล้ว

      const recommendation = cellText(row.getCell("AJ"));
      const commentDate = cellDate(row.getCell("AK"));

      matched.push({ row: rowNum, employee, examDate });

      if (dryRun) continue;

      // ── upsert linked MedicalCheck (checkType = "Medical Check up") ──
      // Conservative: only touch issuedDate/expiryDate, never overwrite
      // an existing `status` (Fit/Unfit is a separate HR decision, not
      // something this import should guess at).
      let medicalCheck = await prisma.medicalCheck.findFirst({
        where: { employeeId: employee.id, checkType: "Medical Check up" },
      });

      if (!medicalCheck) {
        medicalCheck = await prisma.medicalCheck.create({
          data: {
            employeeId: employee.id,
            checkType: "Medical Check up",
            issuedDate: examDate,
            expiryDate: examDate ? addDays(examDate, 365) : null,
            status: "pending", // no fitness verdict implied by import alone
          },
        });
      } else if (
        examDate &&
        (!medicalCheck.issuedDate || examDate > medicalCheck.issuedDate)
      ) {
        medicalCheck = await prisma.medicalCheck.update({
          where: { id: medicalCheck.id },
          data: { issuedDate: examDate, expiryDate: addDays(examDate, 365) },
        });
      }

      // ── upsert MedicalExamRecord (idempotent on employeeId + examDate) ──
      const existingSameDate = await prisma.medicalExamRecord.findFirst({
        where: { employeeId: employee.id, examDate: examDate ?? undefined },
      });

      const recordData = {
        ...fields,
        examDate,
        chronicDisease, // ← เพิ่มบรรทัดนี้
        note,
        healthRisk,
        recommendation,
        commentDate,
        medicalCheckId: medicalCheck.id,
        source: "excel_import",
        sourceFile: filePath.split(/[\\/]/).pop(),
      };

      if (existingSameDate) {
        await prisma.medicalExamRecord.update({
          where: { id: existingSameDate.id },
          data: recordData,
        });
        updated++;
      } else {
        // new exam date for this employee → previous latest is no
        // longer latest; bump version
        const prevLatest = await prisma.medicalExamRecord.findFirst({
          where: { employeeId: employee.id, isLatest: true },
        });
        if (prevLatest) {
          await prisma.medicalExamRecord.update({
            where: { id: prevLatest.id },
            data: { isLatest: false },
          });
        }
        await prisma.medicalExamRecord.create({
          data: {
            ...recordData,
            employeeId: employee.id,
            version: (prevLatest?.version ?? 0) + 1,
            isLatest: true,
          },
        });
        created++;
      }

      // ── sync Employee.healthRisk cache from the latest record ──
      // Only overwrite if this row IS (or becomes) the latest — i.e.
      // skip if we just updated an older, non-latest record in place.
      const isLatestRow =
        !existingSameDate ||
        (
          await prisma.medicalExamRecord.findFirst({
            where: { employeeId: employee.id, isLatest: true },
          })
        ).id === existingSameDate.id;

      if (isLatestRow && healthRisk) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { healthRisk },
        });
      }
    } catch (err) {
      errors.push({
        row: rowNum,
        employee: employee.fullName,
        error: err.message,
      });
    }
  }

  // ── summary ──
  console.log("\n── Import Summary ──");
  console.log(`Matched rows:        ${matched.length}`);
  console.log(`Unmatched rows:      ${unmatched.length}`);
  console.log(`Skipped (empty):     ${skippedEmpty.length}`);
  if (!dryRun) {
    console.log(`Records created:     ${created}`);
    console.log(`Records updated:     ${updated}`);
  }
  console.log(`Errors:              ${errors.length}`);

  if (unmatched.length > 0) {
    console.log("\n── Unmatched (need manual review / name fix) ──");
    for (const u of unmatched) {
      console.log(
        `  Row ${u.row}: TH="${u.thaiName || "—"}" EN="${u.engFirst || "—"} ${u.engLast || ""}"`,
      );
    }
  }

  if (errors.length > 0) {
    console.log("\n── Errors ──");
    for (const e of errors) {
      console.log(`  Row ${e.row} (${e.employee}): ${e.error}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
