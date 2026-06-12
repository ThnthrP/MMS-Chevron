import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE_PATH = path.join(
  __dirname,
  "../../../../training_record_from_hr/importValeura.xlsx",
);

// =========================================================
// Helpers
// =========================================================

function cleanText(value) {
  if (!value) return null;

  return String(value)
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================================================
// Main
// =========================================================

async function seedClientTrainings() {
  console.log("🚀 Seeding Valeura Client Trainings...");

  const CONTRACT_CODE = "VAL-2024";

  // ======================================================
  // Contract
  // ======================================================

  const contract = await prisma.contract.findFirst({
    where: {
      contractNo: CONTRACT_CODE,
    },
  });

  if (!contract) {
    throw new Error(`Contract not found: ${CONTRACT_CODE}`);
  }

  // ======================================================
  // Read Excel
  // ======================================================

  const workbook = xlsx.readFile(FILE_PATH);

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  // ======================================================
  // Skip Header
  // ======================================================

  const dataRows = rows.slice(1);

  let inserted = 0;
  let skipped = 0;

  // ======================================================
  // Loop
  // ======================================================

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    try {
      const row = dataRows[rowIndex];

      // ==================================================
      // Excel Columns
      // A = GlobalTraining
      // B = ClientTraining
      // ==================================================

      const globalName = cleanText(row[0]);

      const clientName = cleanText(row[1]);

      // ==================================================
      // Empty Row
      // ==================================================

      if (!globalName || !clientName) {
        skipped++;

        continue;
      }

      // ==================================================
      // Global Training
      // ==================================================

      const globalTraining = await prisma.globalTraining.findFirst({
        where: {
          name: globalName,
        },
      });

      if (!globalTraining) {
        console.log(`⚠ Global training not found: ${globalName}`);

        skipped++;

        continue;
      }

      // ==================================================
      // Training Standard
      // ==================================================

      const trainingStandard = await prisma.trainingStandard.findFirst({
        where: {
          globalTrainingId: globalTraining.id,
        },
      });

      if (!trainingStandard) {
        console.log(`⚠ Training standard not found: ${globalName}`);

        skipped++;

        continue;
      }

      // ==================================================
      // Upsert Client Training
      // ==================================================

      await prisma.clientTraining.upsert({
        where: {
          globalTrainingId_contractId: {
            globalTrainingId: globalTraining.id,
            contractId: contract.id,
          },
        },

        update: {
          trainingStandardId: trainingStandard.id,

          nameAlias: clientName !== globalName ? clientName : null,
        },

        create: {
          contractId: contract.id,

          globalTrainingId: globalTraining.id,

          trainingStandardId: trainingStandard.id,

          nameAlias: clientName !== globalName ? clientName : null,
        },
      });

      inserted++;

      console.log(`✔ ${clientName} -> ${globalName}`);
    } catch (err) {
      skipped++;

      console.error(`❌ Row ${rowIndex + 2}: ${err.message}`);
    }
  }

  // ======================================================
  // Summary
  // ======================================================

  console.log("\n================================");

  console.log("✅ Valeura Client Training Seed Completed");

  console.log(`✔ Inserted: ${inserted}`);

  console.log(`⚠ Skipped: ${skipped}`);
}

seedClientTrainings()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
