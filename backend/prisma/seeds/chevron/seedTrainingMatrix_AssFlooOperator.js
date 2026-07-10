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
  "../../../../training_record_from_hr/clean/Employee Training Offshore Chevron Ass.Floo Operator.31-3-2026-CLEAN.xlsx",
);

const SHEET_NAME = "Assist Floor Opt Training Requi";
const CONTRACT_CODE = "CHV-2025";

// ============================================================
// Matrix Structure
//
// ต่างจาก seedTrainingMatrix.js เดิม: sheet นี้มีคอลัมน์ Location
// แทรกอยู่ระหว่าง Position กับ training แรก จึงต้องเลื่อน
// TRAINING_START_COL จาก 1 (B) เป็น 2 (C)
//
//   Row 10 (index 9)  = header: A=Position, B=Location, C..=training names
//   Row 12-14 (index 11-13) = ข้อมูล 3 ตำแหน่ง Assist Floor Operator Level 1-3
// ============================================================

const TRAINING_ROW = 9;
const POSITION_START_ROW = 11;
const TRAINING_START_COL = 2; // C — เดิมเป็น 1 (B) แต่ sheet นี้มี Location คั่นก่อน

// ============================================================
// Header columns / rows that are NOT trainings (skip silently)
// ============================================================

const IGNORE_TRAININGS = new Set(["Process", "Training % completed"]);

// ============================================================
// Alias maps
// ไม่จำเป็นต้องมี TRAINING_ALIASES ที่นี่ — เพราะ header ใน sheet นี้ใช้
// ชื่อ HR ดิบ (เช่น "Basic IE") ซึ่งถูกเก็บเป็น nameAlias ของ ClientTraining
// ไว้แล้วจาก seedClientTrainings_AssFlooOperator.js — การค้นหา clientTraining
// ด้านล่าง (OR: nameAlias / globalTraining.name) จะ match ได้เองโดยไม่ต้อง alias ซ้ำ
// ============================================================

const POSITION_ALIASES = {
  // Matrix sheet (แถว A12-14) เขียนว่า "Assistant Floor Operator Level X"
  // (ขาด "s" ที่ Operator) แต่ชื่อ canonical ใน DB คือ
  // "Assistant Floor Operators Level X" — ต้อง alias ให้ตรงก่อน match กับ Position table
  "Assistant Floor Operator Level 1": "Assistant Floor Operators Level 1",
  "Assistant Floor Operator Level 2": "Assistant Floor Operators Level 2",
  "Assistant Floor Operator Level 3": "Assistant Floor Operators Level 3",
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

function normalizePosition(value) {
  const name = normalize(value).replace(/\s*\/\s*/g, " / ");

  return POSITION_ALIASES[name] || name;
}

function isNoteRow(name) {
  return /^NOTE\b/i.test(name) || name.includes('"X"');
}

// ใช้ตามที่ยืนยันไว้ — sheet นี้มีแค่ X (required) ไม่มี O
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

async function seedTrainingMatrixAssFlooOperator() {
  console.log(
    "🚀 Importing Chevron Training Matrix (Assist Floor Operator)...",
  );

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
  // Build Training Column Map
  // ==========================================================

  const trainingColumns = [];

  const headerRow = rows[TRAINING_ROW];

  for (let col = TRAINING_START_COL; col < headerRow.length; col++) {
    const rawName = normalize(headerRow[col]);

    if (!rawName || IGNORE_TRAININGS.has(rawName)) {
      continue;
    }

    const trainingName = rawName;

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
      console.log(
        `   DEBUG length=${positionName.length}, hex=${Buffer.from(positionName, "utf8").toString("hex")}`,
      );
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
  console.log("✅ Chevron Matrix Imported (Assist Floor Operator)");
  console.log(`✔ Inserted: ${inserted}`);
  console.log(`⚠ Skipped: ${skipped}`);
}

seedTrainingMatrixAssFlooOperator()
  .catch((err) => {
    console.error("💥 Import failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
