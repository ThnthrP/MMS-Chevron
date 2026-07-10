import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE_PATH = path.join(
  __dirname,
  "../../../../training_record_from_hr/importChevronAssFlooOperator.xlsx",
);

const SHEET_NAME = "Mapping";

async function seedClientTrainingsAssFlooOperator() {
  console.log("🚀 Seeding Client Trainings (Assist Floor Operator)...");

  const CONTRACT_CODE = "CHV-2025";

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
  // Read Excel — sheet "Mapping" โดยเฉพาะ (ไม่ใช่ sheet แรกของ workbook)
  // ======================================================

  const workbook = xlsx.readFile(FILE_PATH);

  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
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
  let skipped = 0;

  // ======================================================
  // Loop
  // ======================================================

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    try {
      const row = dataRows[rowIndex];

      // ==================================================
      // Excel Columns (สลับจากตัวเดิม — ยืนยันแล้วตามไฟล์จริง)
      // A = # (ไม่ใช้)
      // B = Canonical GlobalTraining Name  ← globalName
      // C = HR Original Name               ← clientName
      // D = Match Type (ไม่ใช้ในสคริปต์นี้ แค่ไว้ดูตอน review)
      // E = Note (ไม่ใช้ในสคริปต์นี้)
      // ==================================================

      const globalName = String(row[1] || "")
        .replace(/\r?\n|\r/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const clientName = String(row[2] || "")
        .replace(/\r?\n|\r/g, " ")
        .replace(/\s+/g, " ")
        .trim();

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
  console.log("✅ Client Training Seed Completed (Assist Floor Operator)");
  console.log(`✔ Inserted: ${inserted}`);
  console.log(`⚠ Skipped: ${skipped}`);
}

seedClientTrainingsAssFlooOperator()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
