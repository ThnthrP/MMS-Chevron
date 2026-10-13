// ============================================================
// scripts/chevron/backfillEmployeeWorkplaceFromPETracking.js
//
// One-time backfill: fills Employee.workplace (col E, สถานที่ทำงานใน
// พื้นที่เชฟรอน / Chevron Workplace) for employees that were already
// created BEFORE Employee.workplace existed — i.e. everyone imported
// by an older run of addMissingEmployeesFromPETracking.js.
//
// This script only UPDATES existing employees. It never creates new
// ones (that's still addMissingEmployeesFromPETracking.js's job).
//
// Matching logic (Thai name / no-space Thai name / English name) is
// copied as-is from addMissingEmployeesFromPETracking.js /
// importMedicalExamRecords.js so the same row always resolves to the
// same employee across all three scripts.
//
// USAGE:
//   node scripts/chevron/backfillEmployeeWorkplaceFromPETracking.js <path-to-xlsx> [options]
//
// OPTIONS:
//   --sheet="30-4-2026"   Worksheet name to read (default: first sheet)
//   --dry-run             Parse + match only, no writes. Always run
//                          this first to review what WOULD be updated.
//   --overwrite            By default, an employee that already has a
//                          non-empty workplace is left untouched (only
//                          fills blanks). Pass this to overwrite existing
//                          non-empty values too.
// ============================================================

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");
const sheetArg = args.find((a) => a.startsWith("--sheet="));
const sheetName = sheetArg ? sheetArg.split("=")[1] : null;

if (!filePath) {
  console.error(
    'Usage: node scripts/chevron/backfillEmployeeWorkplaceFromPETracking.js <path-to-xlsx> [--sheet="name"] [--dry-run] [--overwrite]',
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
  if (dryRun) console.log("── DRY RUN — no database writes will be made ──");
  console.log(
    overwrite
      ? "── --overwrite: will replace existing non-empty workplace values too ──\n"
      : "── default: only fills employees with a blank/null workplace ──\n",
  );

  // ── preload existing employees for matching (same logic as the other scripts) ──
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      fullName: true,
      fullNameTH: true,
      fullNameEN: true,
      workplace: true,
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

  const toUpdate = [];
  const skippedJunk = [];
  const skippedNotFound = [];
  const skippedNoWorkplaceInFile = [];
  const skippedAlreadySet = []; // has a value, --overwrite not passed
  const skippedUnchanged = []; // value in file === value already in DB
  const errors = [];

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const thaiName = cellText(row.getCell("A"));
    const engFirst = cellText(row.getCell("B"));
    const engLast = cellText(row.getCell("C"));
    const workplaceRaw = cellText(row.getCell("E"));

    if (!thaiName && !engFirst) continue; // empty row, silently skip

    if (!looksLikeThaiName(thaiName)) {
      skippedJunk.push({ row: rowNum, thaiName, engFirst, engLast });
      continue;
    }

    if (!workplaceRaw) {
      skippedNoWorkplaceInFile.push({ row: rowNum, thaiName });
      continue;
    }

    try {
      // ── match employee (same fallback order as the other scripts) ──
      let employee = null;
      if (thaiName) employee = byThaiName.get(normalizeName(thaiName)) || null;
      if (!employee && thaiName)
        employee =
          byThaiNameNoSpace.get(normalizeNameNoSpace(thaiName)) || null;
      if (!employee && engFirst) {
        const fullEN = normalizeName(`${engFirst} ${engLast || ""}`);
        employee = byEnglishName.get(fullEN) || null;
      }

      if (!employee) {
        skippedNotFound.push({ row: rowNum, thaiName, engFirst, engLast });
        continue;
      }

      if (employee.workplace === workplaceRaw) {
        skippedUnchanged.push({
          row: rowNum,
          thaiName,
          workplace: workplaceRaw,
        });
        continue;
      }

      if (employee.workplace && !overwrite) {
        skippedAlreadySet.push({
          row: rowNum,
          thaiName,
          existing: employee.workplace,
          inFile: workplaceRaw,
        });
        continue;
      }

      toUpdate.push({
        row: rowNum,
        employeeId: employee.id,
        empCode: employee.empCode,
        thaiName,
        previousWorkplace: employee.workplace,
        newWorkplace: workplaceRaw,
      });
    } catch (err) {
      errors.push({ row: rowNum, thaiName, error: err.message });
    }
  }

  // ── write (unless dry-run) ──
  let updated = 0;
  if (!dryRun) {
    for (const u of toUpdate) {
      await prisma.employee.update({
        where: { id: u.employeeId },
        data: { workplace: u.newWorkplace },
      });
      updated++;
    }
  }

  // ── summary ──
  console.log("\n── Summary ──");
  console.log(`To update:                    ${toUpdate.length}`);
  if (!dryRun) console.log(`Updated:                      ${updated}`);
  console.log(`Already correct (skip):       ${skippedUnchanged.length}`);
  console.log(`Already set, no --overwrite:  ${skippedAlreadySet.length}`);
  console.log(
    `No workplace value in file:   ${skippedNoWorkplaceInFile.length}`,
  );
  console.log(`Employee not found (skip):    ${skippedNotFound.length}`);
  console.log(`Junk rows (skip):             ${skippedJunk.length}`);
  console.log(`Errors:                       ${errors.length}`);

  if (toUpdate.length > 0) {
    console.log(
      `\n── ${dryRun ? "Would update" : "Updated"} (${toUpdate.length}) ──`,
    );
    for (const u of toUpdate) {
      console.log(
        `  Row ${u.row}: ${u.empCode} ${u.thaiName}  "${u.previousWorkplace || "—"}" → "${u.newWorkplace}"`,
      );
    }
  }

  if (skippedAlreadySet.length > 0) {
    console.log(
      "\n── Skipped: already has a workplace, re-run with --overwrite to replace ──",
    );
    for (const s of skippedAlreadySet) {
      console.log(
        `  Row ${s.row}: "${s.thaiName}" existing="${s.existing}" file="${s.inFile}"`,
      );
    }
  }

  if (skippedNotFound.length > 0) {
    console.log(
      "\n── Skipped: no matching employee found (name mismatch / not yet imported) ──",
    );
    for (const s of skippedNotFound) {
      console.log(
        `  Row ${s.row}: TH="${s.thaiName || "—"}" EN="${s.engFirst || "—"} ${s.engLast || ""}"`,
      );
    }
  }

  if (skippedJunk.length > 0) {
    console.log("\n── Skipped: junk rows (no Thai name detected) ──");
    for (const s of skippedJunk) {
      console.log(
        `  Row ${s.row}: TH="${s.thaiName || "—"}" EN="${s.engFirst || "—"} ${s.engLast || ""}"`,
      );
    }
  }

  if (errors.length > 0) {
    console.log("\n── Errors ──");
    for (const e of errors) {
      console.log(`  Row ${e.row} (${e.thaiName}): ${e.error}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
