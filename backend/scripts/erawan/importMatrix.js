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
  "../../../training_record_from_hr/clean/Employee Training Offshore-Erawan 31-3-2026-CLEAN.xlsx",
);

const TRAINING_MAPPING_FILE = path.join(
  __dirname,
  "../../../training_record_from_hr/importErawan.xlsx",
);

const SHEET_NAME = "Training Matrix PTTEP Offs  V15";

const CONTRACT_CODE = "ER-2026";

// =========================================================
// Helpers
// =========================================================

function cleanText(value) {
  if (!value) return null;

  return String(value).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

// =========================================================
// Position Normalize
// =========================================================

function normalizePosition(positionName) {
  if (!positionName) return null;

  let name = cleanText(positionName);

  if (name === "Rigger/Scaffolder") {
    return "Rigger / Scaffolder";
  }

  if (name === "Scaffolding & Painting Foreman") {
    return "Scaffold & Paint Foreman";
  }

  if (name === "Technical Assistant/Project coordinator") {
    return "Technical Assistant / Project Coordinator";
  }

  if (name === "Blaster/Painter") {
    return "Blaster / Painter";
  }

  if (name.includes("Firewatch")) {
    return "Fire Watcher";
  }

  if (name.includes("Multi-skill")) {
    return "Multi-skill: Rigger + Scaffolder + Painter + Fire Watcher Assistant";
  }

  if (name === "Blaster/Painter with Rope Access") {
    return "Blaster / Painter with Rope Access";
  }

  if (name === "Lead Mechanic/Mechanic Foreman") {
    return "Lead Mechanic / Mechanic Foreman";
  }

  if (name === "QA/QC Inspector - NDE/Technician") {
    return "QA/QC Inspector - NDE / Technician";
  }

  if (name === "Structural/Civil Engineer") {
    return "Structural / Civil Engineer";
  }

  if (name === "Work pack Engineer") {
    return "Work Pack Engineer";
  }

  return name;
}

// =========================================================
// Training Mapping
// =========================================================

function buildTrainingMap(sheet) {
  const map = new Map();

  for (let row = 2; row <= 500; row++) {
    const globalTrainingRaw = sheet[`A${row}`]?.v;

    const excelTrainingRaw = sheet[`B${row}`]?.v;

    const globalTraining = cleanText(globalTrainingRaw);

    const excelTraining = cleanText(excelTrainingRaw);

    if (!globalTraining || !excelTraining) {
      continue;
    }

    map.set(excelTraining, globalTraining);
  }

  return map;
}

// =========================================================
// Training Normalize
// =========================================================

function normalizeTraining(trainingName, trainingMap) {
  if (!trainingName) return null;

  const cleanedName = cleanText(trainingName);

  return trainingMap.get(cleanedName) || cleanedName;
}

// =========================================================
// Create Position Requirement
// =========================================================

async function createPositionRequirement(
  positionName,
  trainingName,
  requirementType,
  sourceMatrixCode,
  sourceMatrixSheet,
) {
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
  // Contract
  // =======================================================

  const contract = await prisma.contract.findFirst({
    where: {
      contractNo: CONTRACT_CODE,
    },
  });

  if (!contract) {
    throw new Error(`Contract not found: ${CONTRACT_CODE}`);
  }

  // =======================================================
  // Global Training
  // =======================================================

  const globalTraining = await prisma.globalTraining.findFirst({
    where: {
      name: trainingName,
    },
  });

  if (!globalTraining) {
    throw new Error(`Global training not found: ${trainingName}`);
  }

  // =======================================================
  // Client Training
  // =======================================================

  const clientTraining = await prisma.clientTraining.findFirst({
    where: {
      globalTrainingId: globalTraining.id,
      contractId: contract.id,
    },
  });

  if (!clientTraining) {
    throw new Error(`Client training not found: ${trainingName}`);
  }

  // =======================================================
  // Upsert
  // =======================================================

  await prisma.positionRequirement.upsert({
    where: {
      positionId_clientTrainingId_contractId: {
        positionId: position.id,
        clientTrainingId: clientTraining.id,
        contractId: contract.id,
      },
    },

    update: {
      requirementType,
      sourceMatrixCode,
      sourceMatrixSheet,
    },

    create: {
      positionId: position.id,
      clientTrainingId: clientTraining.id,
      contractId: contract.id,

      requirementType,

      sourceMatrixCode,
      sourceMatrixSheet,
    },
  });

  console.log(`✔ ${positionName} -> ${trainingName} (${requirementType})`);
}

// =========================================================
// Main
// =========================================================

async function importMatrix() {
  console.log("🚀 Importing Erawan Matrix...");

  // =======================================================
  // Matrix Workbook
  // =======================================================

  const workbook = xlsx.readFile(FILE_PATH);

  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  // =======================================================
  // Training Mapping Workbook
  // =======================================================

  const mappingWorkbook = xlsx.readFile(TRAINING_MAPPING_FILE);

  const mappingSheet = mappingWorkbook.Sheets[mappingWorkbook.SheetNames[0]];

  const TRAINING_NAME_MAP = buildTrainingMap(mappingSheet);

  console.log(`📚 Training mappings loaded: ${TRAINING_NAME_MAP.size}`);

  // =======================================================
  // Training Columns
  // H -> BW
  // =======================================================

  const TRAINING_COLUMNS = [];

  for (let col = 8; col <= 75; col++) {
    const columnLetter = xlsx.utils.encode_col(col - 1);

    const trainingNameRaw =
      sheet[`${columnLetter}10`]?.v || sheet[`${columnLetter}11`]?.v;

    const trainingName = normalizeTraining(trainingNameRaw, TRAINING_NAME_MAP);

    if (!trainingName) {
      continue;
    }

    TRAINING_COLUMNS.push({
      columnLetter,
      trainingName,
    });
  }

  console.log(`📚 Trainings found: ${TRAINING_COLUMNS.length}`);

  // =======================================================
  // Requirement Type Mapping
  // =======================================================

  const REQUIREMENT_TYPE_MAP = {
    M: "mandatory",
    R: "relevant",
    X: "required",
    O: "assigned",
  };

  // =======================================================
  // Position Rows
  // B15 -> B49
  // =======================================================

  for (let row = 15; row <= 49; row++) {
    try {
      const positionRaw = sheet[`B${row}`]?.v;

      const positionName = normalizePosition(positionRaw);

      if (!positionName) {
        continue;
      }

      console.log(`\n📌 Position: ${positionName}`);

      // ===================================================
      // Loop Trainings
      // ===================================================

      for (const training of TRAINING_COLUMNS) {
        try {
          const cellValueRaw = sheet[`${training.columnLetter}${row}`]?.v;

          const cellValue = cleanText(cellValueRaw);

          const mappedRequirementType = REQUIREMENT_TYPE_MAP[cellValue];

          // Skip empty cells
          if (!mappedRequirementType) {
            continue;
          }

          await createPositionRequirement(
            positionName,
            training.trainingName,
            mappedRequirementType,
            cellValue,
            SHEET_NAME,
          );
        } catch (err) {
          console.error(
            `❌ ${positionName} -> ${training.trainingName}: ${err.message}`,
          );
        }
      }
    } catch (err) {
      console.error(`❌ Row ${row}: ${err.message}`);
    }
  }

  console.log("\n✅ Done importing Matrix");
}

// =========================================================
// Run
// =========================================================

importMatrix()
  .catch((err) => {
    console.error("💥 Import failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
