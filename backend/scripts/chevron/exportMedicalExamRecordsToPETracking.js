// ============================================================
// scripts/chevron/exportMedicalExamRecordsToPETracking.js
//
// Reverse of importMedicalExamRecords.js — reads MedicalExamRecord
// (isLatest=true) + linked Employee rows from the DB and writes an
// .xlsx file laid out like the original "PE tracking" Excel (41
// columns A..AO, 3-line wrapped TH/EN/ZH headers, autofilter).
//
// KNOWN GAPS — see lib/peTrackingColumns.js header comment:
//   col E (Chevron Workplace) and cols AL–AO (follow-up/expiry) are
//   not recoverable from the current schema and are exported blank.
//
// USAGE:
//   node scripts/chevron/exportMedicalExamRecordsToPETracking.js <output-path.xlsx> [options]
//
// OPTIONS:
//   --sheet="30-4-2026"   Worksheet name for the output (default: "PE tracking export")
// ============================================================

import { PrismaClient } from "@prisma/client";
import { buildPeTrackingWorkbook } from "./lib/buildPeTrackingWorkbook.js";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const outputPath = args.find((a) => !a.startsWith("--"));
const sheetArg = args.find((a) => a.startsWith("--sheet="));
const sheetName = sheetArg ? sheetArg.split("=")[1] : undefined;

if (!outputPath) {
  console.error(
    'Usage: node scripts/chevron/exportMedicalExamRecordsToPETracking.js <output-path.xlsx> [--sheet="name"]',
  );
  process.exit(1);
}

async function main() {
  console.log(
    "Reading MedicalExamRecord (isLatest=true) + Employee from DB...",
  );
  const workbook = await buildPeTrackingWorkbook(prisma, { sheetName });

  const sheet = workbook.worksheets[0];
  console.log(`Writing ${sheet.rowCount - 1} rows to "${outputPath}"...`);
  await workbook.xlsx.writeFile(outputPath);

  console.log("Done.");
  if (!sheetName) {
    console.log(
      'Note: no --sheet passed, worksheet is named "PE tracking export". Pass --sheet="30-4-2026" to match the original tab name if needed.',
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
