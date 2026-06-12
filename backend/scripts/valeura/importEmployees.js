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
  "../../../training_record_from_hr/clean/Employee Training Offshore-Valeura 31-3-2026-CLEAN.xlsx",
);

const SHEET_NAME = "Valeura ";

const POSITION_MAPPINGS = {
  "I&E Foreman": "I/E Foreman",

  "IE Tech": "I/E Technician",

  //   "Hydrotest & Torque Tech": "Hydrotest & Torque Technician",

  Hydrotest: "Hydrotest & Torque Technician",

  Maintanance: "Maintenance",

  "Safety Officer / Fire Watch": "Safety Officer",

  "Fire Watch": "Fire Watcher",

  //   "Painting Supervisor & Inspector": "Painting Supervisor",

  //   "Engineering  Supervisor": "Engineering Supervisor",

  QC: "QA/QC Inspector",

  "Crane Operator A": "Crane Operator, Class A",
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

  return POSITION_MAPPINGS[name] || name;
}

function parseDate(val) {
  if (!val) return null;

  // ==========================================
  // Date object
  // ==========================================

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // ==========================================
  // Excel serial number
  // ==========================================

  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30);

    const date = new Date(excelEpoch.getTime() + val * 86400000);

    return isNaN(date.getTime()) ? null : date;
  }

  // ==========================================
  // String
  // ==========================================

  if (typeof val === "string") {
    if (val.startsWith("=")) {
      return null;
    }

    const parts = val.split("/");

    // dd/mm/yyyy
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);

      const date = new Date(y, m - 1, d);

      return isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(val);

    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

// function isEmployeeRow(fullNameTH, positionName) {
//   if (!fullNameTH || !positionName) {
//     return false;
//   }

//   if (typeof fullNameTH !== "string") {
//     return false;
//   }

//   const name = fullNameTH.trim();

//   if (!name) {
//     return false;
//   }

//   return true;
// }

function isEmployeeRow(fullNameEN, fullNameTH, positionName) {
  if (!positionName) {
    return false;
  }

  const hasTH = typeof fullNameTH === "string" && fullNameTH.trim();

  const hasEN = typeof fullNameEN === "string" && fullNameEN.trim();

  return hasTH || hasEN;
}

// =========================================================
// Create / Reuse Employee
// =========================================================

async function createEmployee({
  employeeCode,

  fullNameEN,
  fullNameTH,

  positionName,

  division,
  startWorkDate,
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

  let existingEmployee = null;

  // =======================================================
  // Find by Thai Name
  // =======================================================

  if (fullNameTH) {
    existingEmployee = await prisma.employee.findFirst({
      where: {
        fullNameTH,
      },
    });
  }

  // =======================================================
  // Find by English Name
  // =======================================================

  if (!existingEmployee && fullNameEN) {
    existingEmployee = await prisma.employee.findFirst({
      where: {
        fullNameEN,
      },
    });
  }

  // =======================================================
  // Reuse Existing Employee
  // =======================================================

  if (existingEmployee) {
    await prisma.employee.update({
      where: {
        id: existingEmployee.id,
      },

      data: {
        // fullName: fullNameTH,
        // fullName: fullNameTH || fullNameEN,
        fullName: fullNameEN || fullNameTH,

        fullNameTH,
        fullNameEN,

        // ================================================
        // Update latest position
        // ================================================

        positionId: position.id,

        division,
        startWorkDate,
      },
    });

    console.log(`♻ Reused | ${existingEmployee.empCode} | ${fullNameTH}`);

    return existingEmployee;
  }

  // =======================================================
  // Create New Employee
  // =======================================================

  const employee = await prisma.employee.create({
    data: {
      empCode: employeeCode,

      //   fullName: fullNameTH,
      // fullName: fullNameTH || fullNameEN,
      fullName: fullNameEN || fullNameTH,

      fullNameTH,
      fullNameEN,

      positionId: position.id,

      division,
      startWorkDate,
    },
  });

  console.log(`✔ Created | ${employee.empCode} | ${fullNameTH}`);

  return employee;
}
// =========================================================
// Main
// =========================================================

async function importEmployees() {
  //   console.log("🚀 Importing PTT Employees...");
  console.log("🚀 Importing Valeura Employees...");

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
      // B = Full Name EN
      // C = Full Name TH
      // D = Position
      // ===================================================

      const fullNameENRaw = sheet[`B${row}`]?.v;

      const fullNameTHRaw = sheet[`C${row}`]?.v;

      const positionRaw = sheet[`D${row}`]?.v;

      const divisionRaw = sheet[`E${row}`]?.v;

      const startWorkDateRaw = sheet[`F${row}`]?.v;

      // ===================================================
      // Clean
      // ===================================================

      const fullNameEN = normalizeName(fullNameENRaw);

      const fullNameTH = normalizeName(fullNameTHRaw);

      const positionName = normalizePosition(positionRaw);

      const division = cleanText(divisionRaw);

      const startWorkDate = parseDate(startWorkDateRaw);

      // ===================================================
      // Skip invalid rows
      // ===================================================

      //   if (!isEmployeeRow(fullNameTH, positionName)) {
      //     continue;
      //   }

      if (!isEmployeeRow(fullNameEN, fullNameTH, positionName)) {
        continue;
      }

      // ===================================================
      // Employee Code
      // ===================================================

      //   const employeeCode = `PTT-${String(runningNumber).padStart(4, "0")}`;
      const employeeCode = `VLR-${String(runningNumber).padStart(4, "0")}`;

      // ===================================================
      // Create
      // ===================================================

      runningNumber++;

      await createEmployee({
        employeeCode,

        fullNameEN,
        fullNameTH,

        positionName,

        division,
        startWorkDate,
      });
    } catch (err) {
      console.error(`❌ Row ${row}: ${err.message}`);
    }
  }

  //   console.log("✅ Done importing PTT Employees");
  console.log("✅ Done importing Valeura Employees");
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
