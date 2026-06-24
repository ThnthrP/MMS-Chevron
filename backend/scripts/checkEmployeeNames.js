import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.join(
  __dirname,
  "../../../training_record_from_hr/Employee age 13-6-26.xlsx",
);

// Normalize ชื่อก่อนเปรียบเทียบ
function normalize(name) {
  return String(name).trim().replace(/\s+/g, " ").toLowerCase();
}

async function main() {
  const workbook = xlsx.readFile(FILE_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const excelNames = [];

  // อ่านรายชื่อจาก Excel (Column C, Row 4-195)
  for (let row = 4; row <= 195; row++) {
    const cell = sheet[`C${row}`];

    if (!cell) continue;

    const name = String(cell.v).trim();

    if (name) {
      excelNames.push(name);
    }
  }

  // ดึงรายชื่อจาก Database
  const employees = await prisma.employee.findMany({
    select: {
      fullNameEN: true,
    },
  });

  const dbNames = employees.map((e) => e.fullNameEN).filter(Boolean);

  // Set ของชื่อที่ normalize แล้ว
  const dbSet = new Set(dbNames.map(normalize));

  const matched = [];
  const missingInDb = [];

  // เปรียบเทียบ Excel -> DB
  for (const name of excelNames) {
    if (dbSet.has(normalize(name))) {
      matched.push(name);
    } else {
      missingInDb.push(name);
    }
  }

  // เปรียบเทียบ DB -> Excel
  const excelSet = new Set(excelNames.map(normalize));

  const missingInExcel = dbNames.filter(
    (name) => !excelSet.has(normalize(name)),
  );

  console.log("========== RESULT ==========");
  console.log("Excel:", excelNames.length);
  console.log("DB:", dbNames.length);
  console.log("Matched:", matched.length);
  console.log("Missing in DB:", missingInDb.length);
  console.log("Missing in Excel:", missingInExcel.length);

  console.log("\n===== Missing in DB =====");
  missingInDb.forEach((name) => console.log(name));

  console.log("\n===== Missing in Excel =====");
  missingInExcel.forEach((name) => console.log(name));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
});
