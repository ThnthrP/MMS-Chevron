// ============================================================
// scripts/chevron/diagnoseMissingExamRecords.js
//
// For every Employee with no latest MedicalExamRecord, checks
// whether their name (Thai/English, same matching logic as
// importMedicalExamRecords.js) appears ANYWHERE in the PE tracking
// Excel file — matched or not.
//
//   - Found in the file (any row, matched or not)  → likely a name-
//     spelling mismatch that made importMedicalExamRecords.js skip
//     them. Fixable by correcting the Excel text or adding an alias.
//   - NOT found in the file at all                 → they simply
//     aren't in this year's PE tracking data — probably genuinely
//     not examined yet, nothing to "fix" in code.
//
// Read-only — makes no database or file changes.
//
// USAGE:
//   node scripts/chevron/diagnoseMissingExamRecords.js <path-to-xlsx> [--sheet="name"]
// ============================================================

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const sheetArg = args.find((a) => a.startsWith("--sheet="));
const sheetName = sheetArg ? sheetArg.split("=")[1] : null;

if (!filePath) {
  console.error(
    'Usage: node scripts/chevron/diagnoseMissingExamRecords.js <path-to-xlsx> [--sheet="name"]',
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
function looksLikeThaiName(s) {
  return !!s && /[\u0E00-\u0E7F]/.test(s);
}

async function main() {
  // ── 1. employees with no latest exam record ──
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      fullName: true,
      fullNameTH: true,
      fullNameEN: true,
      medicalExamRecords: { where: { isLatest: true }, select: { id: true } },
    },
  });
  const noExam = employees.filter((e) => e.medicalExamRecords.length === 0);

  // ── 2. every name that appears in the Excel file (any row, valid or junk) ──
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

  const fileThaiNames = new Set();
  const fileThaiNamesNoSpace = new Set();
  const fileEnglishNames = new Set();

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const thaiName = cellText(row.getCell("A"));
    const engFirst = cellText(row.getCell("B"));
    const engLast = cellText(row.getCell("C"));
    if (!thaiName && !engFirst) continue;
    if (thaiName) {
      fileThaiNames.add(normalizeName(thaiName));
      fileThaiNamesNoSpace.add(normalizeNameNoSpace(thaiName));
    }
    if (engFirst) {
      fileEnglishNames.add(normalizeName(`${engFirst} ${engLast || ""}`));
    }
  }

  console.log(`Employees with no exam record: ${noExam.length}`);
  console.log(`Rows read from Excel:          ${worksheet.rowCount - 1}\n`);

  const inFile = [];
  const notInFile = [];

  for (const e of noExam) {
    const thNorm = e.fullNameTH ? normalizeName(e.fullNameTH) : null;
    const thNoSpace = e.fullNameTH ? normalizeNameNoSpace(e.fullNameTH) : null;
    const enNorm = e.fullNameEN ? normalizeName(e.fullNameEN) : null;

    const found =
      (thNorm && fileThaiNames.has(thNorm)) ||
      (thNoSpace && fileThaiNamesNoSpace.has(thNoSpace)) ||
      (enNorm && fileEnglishNames.has(enNorm));

    if (found) inFile.push(e);
    else notInFile.push(e);
  }

  console.log(
    `── Case 2: name IS in the Excel file, but importMedicalExamRecords.js still didn't create a record (${inFile.length}) ──`,
  );
  console.log(
    "  → likely means Thai matched but the row failed downstream (bad K/exam date, thrown error, etc).",
  );
  console.log(
    "  → re-run importMedicalExamRecords.js --dry-run and check its own Errors/Unmatched section for these specific empCodes.\n",
  );
  for (const e of inFile) {
    console.log(
      `  ${e.empCode}  TH="${e.fullNameTH || "—"}"  EN="${e.fullNameEN || "—"}"`,
    );
  }

  console.log(
    `\n── Case 1: name NOT found anywhere in this Excel file (${notInFile.length}) ──`,
  );
  console.log(
    "  → not a matching bug. This person simply isn't in this year's PE tracking data.",
  );
  console.log(
    "  → either genuinely not examined yet, or their name is spelled so differently it shares",
  );
  console.log(
    "    no normalized form with the file at all (worth a manual look if the count seems high).\n",
  );
  for (const e of notInFile) {
    console.log(
      `  ${e.empCode}  TH="${e.fullNameTH || "—"}"  EN="${e.fullNameEN || "—"}"`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
