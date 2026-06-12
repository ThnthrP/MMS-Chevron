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

const SHEET_NAME = "New Matrix";

const CONTRACT_CODE = "VAL-2024";

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

const TRAINING_MAPPING_FILE = path.join(
  __dirname,
  "../../../training_record_from_hr/importValeura.xlsx",
);

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

  const name = cleanText(positionName);

  return POSITION_MAPPINGS[name] || name;
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
  clientTraining,
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

  console.log(
    `✔ ${positionName} -> ${clientTraining.globalTraining.name} (${requirementType})`,
  );
}

// =========================================================
// Main
// =========================================================

async function importMatrix() {
  console.log("🚀 Importing Valeura Matrix...");

  // =======================================================
  // Workbook
  // =======================================================

  const workbook = xlsx.readFile(FILE_PATH);

  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  const mappingWorkbook = xlsx.readFile(TRAINING_MAPPING_FILE);

  const mappingSheet = mappingWorkbook.Sheets[mappingWorkbook.SheetNames[0]];

  const TRAINING_NAME_MAP = buildTrainingMap(mappingSheet);

  console.log(`📚 Training mappings loaded: ${TRAINING_NAME_MAP.size}`);

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
  // Training Columns
  // C -> AH
  // Row 2
  // =======================================================

  const TRAINING_COLUMNS = [];

  for (let col = 3; col <= 34; col++) {
    const columnLetter = xlsx.utils.encode_col(col - 1);

    const trainingNameRaw = sheet[`${columnLetter}2`]?.v;

    // const cleanedTrainingName = cleanText(trainingNameRaw);
    const trainingName = normalizeTraining(trainingNameRaw, TRAINING_NAME_MAP);

    // if (!cleanedTrainingName) {
    //   continue;
    // }

    if (!trainingName) {
      continue;
    }

    const clientTraining = await prisma.clientTraining.findFirst({
      where: {
        contractId: contract.id,

        // name: cleanedTrainingName,
        globalTraining: {
          name: trainingName,
        },
      },

      include: {
        globalTraining: true,
      },
    });

    if (!clientTraining) {
      //   console.log(`⚠ No mapping: "${cleanedTrainingName}"`);
      console.log(`⚠ No mapping: "${trainingNameRaw}"`);

      continue;
    }

    TRAINING_COLUMNS.push({
      columnLetter,

      clientTraining,

      globalTraining: clientTraining.globalTraining,
    });
  }

  console.log(`📚 Trainings found: ${TRAINING_COLUMNS.length}`);

  // =======================================================
  // Requirement Type Mapping
  // =======================================================

  const REQUIREMENT_TYPE_MAP = {
    "•": "mandatory",
  };

  // =======================================================
  // Position Rows
  // B3 -> B21
  // =======================================================

  for (let row = 3; row <= 21; row++) {
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

          // Skip empty / X / O
          if (!mappedRequirementType) {
            continue;
          }

          await createPositionRequirement(
            positionName,
            training.clientTraining,
            mappedRequirementType,
            cellValue,
            SHEET_NAME,
          );
        } catch (err) {
          console.error(
            `❌ ${positionName} -> ${training.globalTraining.name}: ${err.message}`,
          );
        }
      }
    } catch (err) {
      console.error(`❌ Row ${row}: ${err.message}`);
    }
  }

  console.log("\n✅ Done importing Valeura Matrix");
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
