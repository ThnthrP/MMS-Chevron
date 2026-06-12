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

// const TRAINING_MAPPING_FILE = path.join(
//   __dirname,
//   "../../../training_record_from_hr/importChevron-Emp.xlsx",
// );

const SHEET_NAME = "Chevron Matrix 2025(14-11-25)";

const CONTRACT_CODE = "CHV-2025";

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

  if (name === "CPP Crane Assistant / Rigger/Scaffolder") {
    return "CPP Crane Assistant / Rigger / Scaffolder";
  }

  if (name === "Construction Utility Foreman (Painter/Scaffolder)") {
    return "Construction Utility Foreman (Painter / Scaffolder)";
  }

  if (name === "Rigger/Scaffolder + Rope Access Lead level") {
    return "Rigger / Scaffolder + Rope Access Lead Level";
  }

  if (name === "Rigger/Scaffolder + Rope Access Technician level") {
    return "Rigger / Scaffolder + Rope Access Technician Level";
  }

  if (name === "Rigger/Scaffolder (Skill Mechanic)") {
    return "Rigger / Scaffolder (Skill Mechanic)";
  }

  if (name === "Construction, Supervisor (Mech & E&I)") {
    return "Construction Supervisor (Mech)";
  }

  if (name === "Construction Utility Foreman (Painter/ Scaffolder)") {
    return "Construction Utility Foreman (Painter / Scaffolder)";
  }

  if (name === "CPP Crane Operator, Class A (Certify by Company)") {
    return "CPP Crane Operator, Class A";
  }

  return name;
}

// =========================================================
// Training Mapping
// =========================================================

// function buildTrainingMap(sheet) {
//   const map = new Map();

//   for (let row = 2; row <= 500; row++) {
//     const globalTrainingRaw = sheet[`A${row}`]?.v;

//     const excelTrainingRaw = sheet[`B${row}`]?.v;

//     const globalTraining = cleanText(globalTrainingRaw);

//     const excelTraining = cleanText(excelTrainingRaw);

//     if (!globalTraining || !excelTraining) {
//       continue;
//     }

//     map.set(excelTraining, globalTraining);
//   }

//   return map;
// }

// =========================================================
// Training Normalize
// =========================================================

// function normalizeTraining(trainingName, trainingMap) {
//   if (!trainingName) return null;

//   const cleanedName = cleanText(trainingName);

//   return trainingMap.get(cleanedName) || cleanedName;
// }

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
  console.log("🚀 Importing Chevron Matrix...");

  // =======================================================
  // Matrix Workbook
  // =======================================================

  const workbook = xlsx.readFile(FILE_PATH);

  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  // =======================================================
  // Training Columns
  // D -> AZ
  // =======================================================

  const contract = await prisma.contract.findFirst({
    where: {
      contractNo: CONTRACT_CODE,
    },
  });

  if (!contract) {
    throw new Error(`Contract not found: ${CONTRACT_CODE}`);
  }

  const TRAINING_COLUMNS = [];

  for (let col = 4; col <= 52; col++) {
    const columnLetter = xlsx.utils.encode_col(col - 1);

    const trainingNameRaw = sheet[`${columnLetter}10`]?.v;

    // const trainingName = normalizeTraining(trainingNameRaw, TRAINING_NAME_MAP);

    const cleanedTrainingName = cleanText(trainingNameRaw);

    if (!cleanedTrainingName) {
      continue;
    }

    const clientTraining = await prisma.clientTraining.findFirst({
      where: {
        contractId: contract.id,

        OR: [
          {
            nameAlias: cleanedTrainingName,
          },
          {
            globalTraining: {
              name: cleanedTrainingName,
            },
          },
        ],
      },

      include: {
        globalTraining: true,
      },
    });

    if (!clientTraining) {
      console.log(`⚠ No mapping: "${cleanedTrainingName}"`);

      continue;
    }

    // if (!trainingName) {
    //   continue;
    // }

    // TRAINING_COLUMNS.push({
    //   columnLetter,
    //   trainingName,
    // });

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
    X: "mandatory",
    O: "assigned",
  };

  // =======================================================
  // Position Rows
  // A12 -> A37
  // =======================================================

  for (let row = 12; row <= 37; row++) {
    try {
      const positionRaw = sheet[`A${row}`]?.v;

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
            training.clientTraining,
            mappedRequirementType,
            cellValue,
            SHEET_NAME,
          );
        } catch (err) {
          //   console.error(
          //     `❌ ${positionName} -> ${training.trainingName}: ${err.message}`,
          //   );
          console.error(
            `❌ ${positionName} -> ${training.globalTraining.name}: ${err.message}`,
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
