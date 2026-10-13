// ============================================================
// scripts/chevron/traceExcelRowMatch.js
//
// Finds the Excel row(s) whose col B/C (English name) contain the
// given search term, prints the RAW col A/B/C text exactly as read
// from the file, then runs the EXACT SAME matching logic as
// importMedicalExamRecords.js against the DB to show which employee
// that row would resolve to (and update).
//
// Built to catch silent misattribution: a row matching a DIFFERENT
// employee than the one you'd expect from the name, overwriting
// that other employee's real exam data.
//
// Read-only — makes no database changes.
//
// USAGE:
//   node scripts/chevron/traceExcelRowMatch.js <path-to-xlsx> "<english name search term>" [--sheet="name"]
// ============================================================

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const filePath = positional[0];
const searchTerm = positional[1];
const sheetArg = args.find((a) => a.startsWith("--sheet="));
const sheetName = sheetArg ? sheetArg.split("=")[1] : null;

if (!filePath || !searchTerm) {
  console.error(
    'Usage: node scripts/chevron/traceExcelRowMatch.js <path-to-xlsx> "<search term>" [--sheet="name"]',
  );
  process.exit(1);
}

function cellText(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && "result" in v)
    return String(v.result ?? "").trim() || null;
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

function normalizeName(s) {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}
function normalizeNameNoSpace(s) {
  return (s || "").replace(/\s+/g, "").trim().toLowerCase();
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];
  if (!worksheet) {
    console.error(
      `Worksheet ${sheetName ? `"${sheetName}"` : "(first sheet)"} not found`,
    );
    process.exit(1);
  }

  // ── build the SAME matching maps importMedicalExamRecords.js builds ──
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
  const byThaiNameNoSpace = new Map();
  const byEnglishName = new Map();
  for (const e of employees) {
    if (e.fullNameTH) {
      byThaiName.set(normalizeName(e.fullNameTH), e);
      byThaiNameNoSpace.set(normalizeNameNoSpace(e.fullNameTH), e);
    }
    if (e.fullName) {
      byThaiName.set(normalizeName(e.fullName), e);
      byThaiNameNoSpace.set(normalizeNameNoSpace(e.fullName), e);
    }
    if (e.fullNameEN) byEnglishName.set(normalizeName(e.fullNameEN), e);
  }

  const needle = normalizeName(searchTerm);
  let found = 0;

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const thaiName = cellText(row.getCell("A"));
    const engFirst = cellText(row.getCell("B"));
    const engLast = cellText(row.getCell("C"));
    if (!thaiName && !engFirst) continue;

    const rowEnFull = normalizeName(`${engFirst || ""} ${engLast || ""}`);
    if (
      !rowEnFull.includes(needle) &&
      !normalizeName(thaiName).includes(needle)
    )
      continue;

    found++;
    console.log(`\n── Row ${rowNum} — raw Excel values ──`);
    console.log(`  col A (Thai):      "${thaiName || "—"}"`);
    console.log(`  col B (EN first):  "${engFirst || "—"}"`);
    console.log(`  col C (EN last):   "${engLast || "—"}"`);

    // replicate importMedicalExamRecords.js's matching fallback order exactly
    let employee = null;
    let matchedVia = null;
    if (thaiName) {
      employee = byThaiName.get(normalizeName(thaiName)) || null;
      if (employee) matchedVia = "byThaiName (exact, spaces collapsed)";
    }
    if (!employee && thaiName) {
      employee = byThaiNameNoSpace.get(normalizeNameNoSpace(thaiName)) || null;
      if (employee) matchedVia = "byThaiNameNoSpace (all spaces stripped)";
    }
    if (!employee && engFirst) {
      const fullEN = normalizeName(`${engFirst} ${engLast || ""}`);
      employee = byEnglishName.get(fullEN) || null;
      if (employee) matchedVia = "byEnglishName";
    }

    if (!employee) {
      console.log(
        `  → RESULT: unmatched (would appear in importMedicalExamRecords.js's "Unmatched" list)`,
      );
    } else {
      console.log(
        `  → RESULT: resolves to ${employee.empCode}  TH="${employee.fullNameTH || "—"}"  EN="${employee.fullNameEN || "—"}"  fullName="${employee.fullName}"  (matched via ${matchedVia})`,
      );
    }
  }

  if (found === 0)
    console.log(`No Excel rows found containing "${searchTerm}" in col A/B/C.`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
