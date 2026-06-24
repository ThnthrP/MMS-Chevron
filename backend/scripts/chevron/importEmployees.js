import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =========================================================
// Config
// =========================================================

const FILE_PATH = path.join(
  __dirname,
  "../../../training_record_from_hr/clean/Employee Training Offshore-Chevron 31-3-2026-CLEAN.xlsx",
);

const SHEET_NAME = "Record";

const POSITION_MAPPINGS = {
  "Rigger/Scaffolder": "Rigger / Scaffolder",

  "CPP Crane Assistant / Rigger/Scaffolder":
    "CPP Crane Assistant / Rigger / Scaffolder",

  "Construction Utility Foreman (Painter/Scaffolder)":
    "Construction Utility Foreman (Painter / Scaffolder)",

  "Rigger/Scaffolder + Rope Access Lead level":
    "Rigger / Scaffolder + Rope Access Lead Level",

  "Rigger/Scaffolder + Rope Access Technician level":
    "Rigger / Scaffolder + Rope Access Technician Level",

  "Rigger/Scaffolder (Skill Mechanic)": "Rigger / Scaffolder (Skill Mechanic)",
};

// =========================================================
// Helpers
// =========================================================

function cleanText(value) {
  if (!value) return null;

  return String(value).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeName(name) {
  if (!name) return null;

  return cleanText(name)?.replace(/\s+/g, " ")?.trim();
}

function normalizePosition(positionName) {
  if (!positionName) return null;

  const name = cleanText(positionName);

  // explicit mapping ก่อน → แล้ว normalize เว้นวรรครอบ "/" ให้เป็น " / "
  // (ตรงกับ seedPositions ที่ใช้ " / " เสมอ — กันเคส "(Piping/Structure)" ฯลฯ)
  return (POSITION_MAPPINGS[name] || name).replace(/\s*\/\s*/g, " / ");
}

// function isEmployeeRow(fullNameEN, positionName) {
function isEmployeeRow(fullNameTH, positionName) {
  //   if (!fullNameEN || !positionName) {
  if (!fullNameTH || !positionName) {
    return false;
  }

  //   if (typeof fullNameEN !== "string") {
  if (typeof fullNameTH !== "string") {
    return false;
  }

  //   const name = fullNameEN.trim();
  const name = fullNameTH.trim();

  if (!name) {
    return false;
  }

  return true;
}

// =========================================================
// Create Employee
// =========================================================

async function createEmployee({
  employeeCode,
  fullNameEN,
  fullNameTH,
  positionName,
}) {
  // =======================================================
  // Position
  // =======================================================

  const position = await prisma.position.findFirst({
    where: {
      name: positionName,
    },
  });

  if (!position) {
    throw new Error(`Position not found: ${positionName}`);
  }

  // =======================================================
  // Upsert
  // =======================================================

  await prisma.employee.upsert({
    where: {
      empCode: employeeCode,
    },

    update: {
      fullName: fullNameEN || fullNameTH,

      fullNameTH,
      fullNameEN,

      positionId: position.id,
    },

    create: {
      empCode: employeeCode,

      fullName: fullNameEN || fullNameTH,

      fullNameTH,
      fullNameEN,

      positionId: position.id,
    },
  });

  console.log(`✔ ${employeeCode} | ${fullNameEN}`);
}

// =========================================================
// Main
// =========================================================

async function importEmployees() {
  console.log("🚀 Importing Chevron Employees...");

  // =======================================================
  // Workbook
  // =======================================================

  const workbook = xlsx.readFile(FILE_PATH);

  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  // =======================================================
  // Import rows
  // =======================================================

  let runningNumber = 1;

  for (let row = 8; row <= 1000; row++) {
    try {
      // ===================================================
      // Columns
      // ===================================================

      const fullNameENRaw = sheet[`C${row}`]?.v;

      const fullNameTHRaw = sheet[`D${row}`]?.v;

      const positionRaw = sheet[`E${row}`]?.v;

      // ===================================================
      // Clean
      // ===================================================

      const fullNameEN = normalizeName(fullNameENRaw);

      const fullNameTH = normalizeName(fullNameTHRaw);

      const positionName = normalizePosition(positionRaw);

      // ===================================================
      // Skip invalid rows
      // ===================================================

      //   if (!isEmployeeRow(fullNameEN, positionName)) {
      if (!isEmployeeRow(fullNameTH, positionName)) {
        continue;
      }

      // ===================================================
      // Employee Code
      // ===================================================

      const employeeCode = `EXPT-${String(runningNumber).padStart(3, "0")}`;

      // ===================================================
      // Create
      // ===================================================

      await createEmployee({
        employeeCode,
        fullNameEN,
        fullNameTH,
        positionName,
      });

      runningNumber++;
    } catch (err) {
      console.error(`❌ Row ${row}: ${err.message}`);
    }
  }

  console.log("✅ Done importing Chevron Employees");
}

// =========================================================
// Run
// =========================================================

importEmployees()
  .catch((err) => {
    console.error("💥 Import failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
