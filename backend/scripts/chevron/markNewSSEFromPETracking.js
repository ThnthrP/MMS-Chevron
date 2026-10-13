// ============================================================
// scripts/chevron/markNewSSEFromPETracking.js
//
// Sets Employee.sseLevel = "new_sse" for people listed under the
// "New SSE" marker row in the PE tracking Excel (default: rows
// 175–201, right after the pink "New SSE" divider row seen in the
// sheet) — matching logic re-used from
// addMissingEmployeesFromPETracking.js so the same person always
// resolves to the same Employee record across both scripts.
//
// IMPORTANT: Run addMissingEmployeesFromPETracking.js FIRST (and
// commit its creates) if any of these rows are brand-new people not
// yet in the system — otherwise this script will report them as
// "not found" and skip them.
//
// USAGE:
//   node scripts/chevron/markNewSSEFromPETracking.js <path-to-xlsx> [options]
//
// OPTIONS:
//   --sheet="30-4-2026"   Worksheet name to read (default: first sheet)
//   --from=175             First row to include (default: 175)
//   --to=201                Last row to include (default: 201)
//   --dry-run              Match only, no writes. Always run first.
// ============================================================

import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const sheetArg = args.find((a) => a.startsWith("--sheet="));
const sheetName = sheetArg ? sheetArg.split("=")[1] : null;
const fromArg = args.find((a) => a.startsWith("--from="));
const toArg = args.find((a) => a.startsWith("--to="));
const fromRow = fromArg ? parseInt(fromArg.split("=")[1], 10) : 175;
const toRow = toArg ? parseInt(toArg.split("=")[1], 10) : 201;

if (!filePath) {
  console.error(
    'Usage: node scripts/chevron/markNewSSEFromPETracking.js <path-to-xlsx> [--sheet="name"] [--from=175] [--to=201] [--dry-run]',
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

  console.log(
    `Reading sheet "${worksheet.name}", rows ${fromRow}–${toRow} (${toRow - fromRow + 1} rows)`,
  );
  if (dryRun) console.log("── DRY RUN — no database writes will be made ──\n");

  // ── preload existing employees for matching (same logic as addMissingEmployeesFromPETracking.js) ──
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      fullName: true,
      fullNameTH: true,
      fullNameEN: true,
      sseLevel: true,
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
  const skippedAlreadySet = [];
  const errors = [];

  for (let rowNum = fromRow; rowNum <= toRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const thaiName = cellText(row.getCell("A"));
    const engFirst = cellText(row.getCell("B"));
    const engLast = cellText(row.getCell("C"));

    if (!thaiName && !engFirst) continue; // empty row, silently skip

    if (!looksLikeThaiName(thaiName)) {
      skippedJunk.push({ row: rowNum, thaiName, engFirst, engLast });
      continue;
    }

    try {
      let existing = null;
      if (thaiName) existing = byThaiName.get(normalizeName(thaiName)) || null;
      if (!existing && thaiName)
        existing =
          byThaiNameNoSpace.get(normalizeNameNoSpace(thaiName)) || null;
      if (!existing && engFirst) {
        const fullEN = normalizeName(`${engFirst} ${engLast || ""}`);
        existing = byEnglishName.get(fullEN) || null;
      }

      if (!existing) {
        skippedNotFound.push({ row: rowNum, thaiName, engFirst, engLast });
        continue;
      }

      if (existing.sseLevel === "new_sse") {
        skippedAlreadySet.push({
          row: rowNum,
          thaiName,
          matchedTo: existing.fullName,
        });
        continue;
      }

      toUpdate.push({
        row: rowNum,
        thaiName,
        employeeId: existing.id,
        empCode: existing.empCode,
        matchedTo: existing.fullName,
        previousSseLevel: existing.sseLevel,
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
        data: { sseLevel: "new_sse" },
      });
      updated++;
    }
  }

  // ── summary ──
  console.log("\n── Summary ──");
  console.log(`To update:              ${toUpdate.length}`);
  if (!dryRun) console.log(`Updated:                ${updated}`);
  console.log(`Already New SSE (skip): ${skippedAlreadySet.length}`);
  console.log(`Not found (skip):       ${skippedNotFound.length}`);
  console.log(`Junk rows (skip):       ${skippedJunk.length}`);
  console.log(`Errors:                 ${errors.length}`);

  if (toUpdate.length > 0) {
    console.log(
      `\n── ${dryRun ? "Would set" : "Set"} sseLevel = new_sse (${toUpdate.length}) ──`,
    );
    for (const u of toUpdate) {
      console.log(
        `  Row ${u.row}: ${u.empCode}  ${u.matchedTo}  (was: ${u.previousSseLevel || "—"})`,
      );
    }
  }

  if (skippedAlreadySet.length > 0) {
    console.log("\n── Skipped: already New SSE ──");
    for (const s of skippedAlreadySet) {
      console.log(`  Row ${s.row}: ${s.matchedTo}`);
    }
  }

  if (skippedNotFound.length > 0) {
    console.log(
      "\n── Skipped: not found in system (run addMissingEmployeesFromPETracking.js first?) ──",
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
