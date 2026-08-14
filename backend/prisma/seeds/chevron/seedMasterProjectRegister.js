import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE_PATH = path.join(
  __dirname,
  "../../../../master_project_register/Master Project Register (filter ClientChv-2024-2026)-filtered.xlsx",
);

// ปรับชื่อ sheet ตรงนี้ถ้าไฟล์ filtered มีชื่อ tab ต่างจากต้นฉบับ
const SHEET_NAME = "Project Number";

// ── helpers ──
function toIntOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

function toDecimalOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  // ตัด quote/comma/ตัวอักษรที่ไม่ใช่ตัวเลขหรือจุดทศนิยมออก เช่น "74,017.50" -> 74017.50
  const cleaned = String(v).replace(/[",]/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function toStringOrNull(v) {
  const s = String(v ?? "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s === "" ? null : s;
}

async function seedMasterProjectRegister() {
  console.log("🚀 Seeding Master Project Register...");

  // ======================================================
  // Read Excel
  // ======================================================

  const workbook = xlsx.readFile(FILE_PATH);
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(
      `Sheet not found: ${SHEET_NAME} — available sheets: ${workbook.SheetNames.join(", ")}`,
    );
  }

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  // ======================================================
  // Skip Header
  // ======================================================

  const dataRows = rows.slice(1);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // ======================================================
  // Column mapping (ยืนยันแล้วตามไฟล์จริง)
  // A = เจ้าของงาน        ← owner
  // B = year              ← year
  // C = Project On        ← projectCode (unique, required)
  // D = Project / Job     ← jobTitle
  // E = CC. No.           ← ccNo
  // F = Project Engineer  ← engineer
  // G = Customer Name     ← customerName
  // H = WR / PO / SR      ← wrPoSr
  // I = WO / AFE          ← woAfe
  // J = WA                ← wa
  // K = Expt EQ           ← exptEq (raw string ตามต้นฉบับ)
  // L = Term of Payment   ← termOfPaymentDays
  // M = Company           ← company
  // N = Team              ← team
  // O = Payment Terms     ← paymentTerms
  // P = Total Value       ← totalValue
  // ======================================================

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    try {
      const row = dataRows[rowIndex];

      const owner = toStringOrNull(row[0]);
      const year = toIntOrNull(row[1]);
      const projectCode = toStringOrNull(row[2]);
      const jobTitle = toStringOrNull(row[3]);
      const ccNo = toStringOrNull(row[4]);
      const engineer = toStringOrNull(row[5]);
      const customerName = toStringOrNull(row[6]);
      const wrPoSr = toStringOrNull(row[7]);
      const woAfe = toStringOrNull(row[8]);
      const wa = toStringOrNull(row[9]);
      const exptEq = toStringOrNull(row[10]);
      const termOfPaymentDays = toIntOrNull(row[11]);
      const company = toStringOrNull(row[12]);
      const team = toStringOrNull(row[13]);
      const paymentTerms = toStringOrNull(row[14]);
      const totalValue = toDecimalOrNull(row[15]);

      // ── ต้องมี Project On (ref. code) เสมอ — ไม่งั้น skip ──
      if (!projectCode) {
        skipped++;
        continue;
      }

      if (!year || !jobTitle) {
        console.log(
          `⚠ Row ${rowIndex + 2}: missing year/jobTitle for ${projectCode} — skipped`,
        );
        skipped++;
        continue;
      }

      const result = await prisma.masterProjectRecord.upsert({
        where: { projectCode },
        update: {
          owner,
          year,
          jobTitle,
          ccNo,
          engineer,
          customerName,
          wrPoSr,
          woAfe,
          wa,
          exptEq,
          termOfPaymentDays,
          company,
          team,
          paymentTerms,
          totalValue,
          sourceFile: path.basename(FILE_PATH),
        },
        create: {
          owner,
          year,
          projectCode,
          jobTitle,
          ccNo,
          engineer,
          customerName,
          wrPoSr,
          woAfe,
          wa,
          exptEq,
          termOfPaymentDays,
          company,
          team,
          paymentTerms,
          totalValue,
          sourceFile: path.basename(FILE_PATH),
        },
      });

      // เดา insert/update จาก createdAt vs importedAt เท่ากันหรือไม่ (upsert ไม่บอกตรงๆ)
      if (result.importedAt.getTime() === result.updatedAt.getTime()) {
        inserted++;
      } else {
        updated++;
      }

      console.log(`✔ ${projectCode} — ${jobTitle}`);
    } catch (err) {
      skipped++;
      console.error(`❌ Row ${rowIndex + 2}: ${err.message}`);
    }
  }

  // ======================================================
  // Summary
  // ======================================================

  console.log("\n================================");
  console.log("✅ Master Project Register Seed Completed");
  console.log(`✔ Inserted: ${inserted}`);
  console.log(`✔ Updated: ${updated}`);
  console.log(`⚠ Skipped: ${skipped}`);
}

seedMasterProjectRegister()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
