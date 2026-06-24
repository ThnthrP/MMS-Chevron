import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

import { PrismaClient, RequirementType } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Config
// ============================================================

const FILE_PATH = path.join(
  __dirname,
  "../../../../training_record_from_hr/clean/Employee Training Offshore-Chevron 31-3-2026-CLEAN.xlsx",
);

const SHEET_NAME = "Chevron Matrix 2025(14-11-25)";
const CONTRACT_CODE = "CHV-2025";

// ============================================================
// Header columns / rows that are NOT trainings (skip silently)
// ============================================================

const IGNORE_TRAININGS = new Set(["Process", "Training % completed"]);

// ============================================================
// Alias maps: messy Excel text -> canonical DB name
// ⚠ ค่าทางขวาเป็นการเดาชื่อใน DB — verify กับ seedGlobalTrainings /
//   seedPositions ของจริง (ดูหมายเหตุท้ายไฟล์)
// ============================================================

const TRAINING_ALIASES = {
  "Certification of Basis Offshore Safety Training (BOST) or Tropical Basis Offshore Safety Induction and Emegency TrainingTraining (TBOSIET) or Tropical Further Offshore Emergency Training ( TFOET training)":
    "T-BOSIET",

  "Fire watch": "Fire Watch",

  "* Insulation": "Insulation",

  "Qulified Gas Tester (QGT)": "Qualified Gas Tester (QGT)",

  "Isolation of Hazardous energy (IHE)": "Isolation of Hazardous Energy (IHE)",
};

const POSITION_ALIASES = {
  // comma เกินใน sheet
  "Construction, Supervisor (Mech & E&I)":
    "Construction Supervisor (Mech & E&I)",
};

// ============================================================
// Helpers
// ============================================================

function normalize(value) {
  return String(value || "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// รวม slash ทุกแบบ (/, / , /  , ...) ให้เป็น " / " แล้วค่อย map
function normalizePosition(value) {
  const name = normalize(value).replace(/\s*\/\s*/g, " / ");

  return POSITION_ALIASES[name] || name;
}

function isNoteRow(name) {
  return /^NOTE\b/i.test(name) || name.includes('"X"');
}

function mapRequirement(value) {
  const v = normalize(value).toUpperCase();

  switch (v) {
    case "X":
      return RequirementType.required;

    case "O":
      return RequirementType.assigned;

    default:
      return null;
  }
}

// ============================================================
// Main
// ============================================================

async function seedTrainingMatrix() {
  console.log("🚀 Importing Chevron Training Matrix...");

  const contract = await prisma.contract.findFirst({
    where: {
      contractNo: CONTRACT_CODE,
    },
  });

  if (!contract) {
    throw new Error(`Contract not found: ${CONTRACT_CODE}`);
  }

  // ==========================================================
  // Load Excel
  // ==========================================================

  const workbook = xlsx.readFile(FILE_PATH);

  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  // ==========================================================
  // Matrix Structure
  // ==========================================================

  const TRAINING_ROW = 9;
  const POSITION_START_ROW = 11;
  const TRAINING_START_COL = 1;

  // ==========================================================
  // Build Training Column Map
  // ==========================================================

  const trainingColumns = [];

  const headerRow = rows[TRAINING_ROW];

  for (let col = TRAINING_START_COL; col < headerRow.length; col++) {
    const rawName = normalize(headerRow[col]);

    // คอลัมน์ว่าง หรือไม่ใช่ training → ข้ามเงียบ
    if (!rawName || IGNORE_TRAININGS.has(rawName)) {
      continue;
    }

    const trainingName = TRAINING_ALIASES[rawName] || rawName;

    const clientTraining = await prisma.clientTraining.findFirst({
      where: {
        contractId: contract.id,
        OR: [
          {
            nameAlias: {
              equals: trainingName,
              mode: "insensitive",
            },
          },
          {
            globalTraining: {
              name: {
                equals: trainingName,
                mode: "insensitive",
              },
            },
          },
        ],
      },
    });

    if (!clientTraining) {
      console.log(`⚠ Training not found: ${trainingName}`);

      continue;
    }

    trainingColumns.push({
      col,
      trainingId: clientTraining.id,
      trainingName,
    });
  }

  console.log(`📚 Trainings mapped: ${trainingColumns.length}`);

  // ==========================================================
  // Import Matrix
  // ==========================================================

  let inserted = 0;
  let skipped = 0;

  for (let rowIndex = POSITION_START_ROW; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    const positionName = normalizePosition(row[0]);

    // แถวว่าง หรือแถว note/legend → ข้ามเงียบ
    if (!positionName || isNoteRow(positionName)) {
      continue;
    }

    const position = await prisma.position.findFirst({
      where: {
        name: {
          equals: positionName,
          mode: "insensitive",
        },
      },
    });

    if (!position) {
      console.log(`⚠ Position not found: ${positionName}`);

      skipped++;

      continue;
    }

    for (const training of trainingColumns) {
      const symbol = normalize(row[training.col]).toUpperCase();

      const requirementType = mapRequirement(symbol);

      if (!requirementType) {
        continue;
      }

      try {
        await prisma.positionRequirement.upsert({
          where: {
            positionId_clientTrainingId_contractId: {
              positionId: position.id,
              clientTrainingId: training.trainingId,
              contractId: contract.id,
            },
          },

          update: {
            requirementType,
            sourceMatrixCode: symbol,
            sourceMatrixSheet: SHEET_NAME,
          },

          create: {
            positionId: position.id,
            clientTrainingId: training.trainingId,
            contractId: contract.id,

            requirementType,
            sourceMatrixCode: symbol,
            sourceMatrixSheet: SHEET_NAME,
          },
        });

        inserted++;
      } catch (err) {
        console.log(
          `❌ ${positionName} -> ${training.trainingName}: ${err.message}`,
        );

        skipped++;
      }
    }
  }

  console.log("\n================================");
  console.log("✅ Chevron Matrix Imported");
  console.log(`✔ Inserted: ${inserted}`);
  console.log(`⚠ Skipped: ${skipped}`);
}

seedTrainingMatrix()
  .catch((err) => {
    console.error("💥 Import failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
