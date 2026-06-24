import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Config
// ============================================================

const FILE_PATH = path.join(
  __dirname,
  "../../../training_record_from_hr/clean/Employee Training Offshore-Chevron 31-3-2026-CLEAN.xlsx",
);

const CLIENT_NAME = "Chevron";

const SHEET_NAME = "Record";

// checkType มาตรฐานทั้งระบบ (ตรงกับ schema/createMedical/EditWorker/Compliance)
const MEDICAL_CHECK_TYPE = "Medical Check up";

// ============================================================
// Excel Structure  (อิงไฟล์ CLEAN — column เลื่อนซ้าย 1 จาก original)
// ยืนยันด้วย debug: F=hospital, G=issued, H=expired
// ============================================================

const COL = {
  FULL_NAME_EN: 1, // B
  FULL_NAME_TH: 2, // C
  POSITION: 3, // D

  MEDICAL_HOSP: 5, // F
  MEDICAL_ISSUE: 6, // G
  MEDICAL_EXP: 7, // H
  MEDICAL_OK: 9, // J  (ใน CLEAN file ช่องนี้ว่าง — ไม่ใช้คิด status แล้ว)

  COVID_VACCINE: 10, // K

  PDPA_CONSENT: 22, // W

  TRAINING_START: 23, // X
};

const ROW = {
  TRAINING_NAME: 4, // row 5
  TRAINING_FIELD: 6, // row 7

  EMPLOYEE_START: 7, // row 8
  EMPLOYEE_END: 162, // row 163
};

// ============================================================
// Constants
// ============================================================

const NO_EXPIRY_YEAR = 2099;

// ============================================================
// Helpers
// ============================================================

function cleanText(value) {
  if (!value) return null;

  return String(value)
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// Date Helpers
// ============================================================

// ✅ year guard: ปฏิเสธปีเพี้ยน (1900 จาก serial number, 0132 จาก "132/12/31" ฯลฯ)
function inRange(d) {
  if (!d || isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  if (y < 1990 || y > 2100) return null;
  return d;
}

function parseDate(val) {
  if (!val) return null;

  if (val instanceof Date) {
    return inRange(val);
  }

  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return inRange(new Date(excelEpoch.getTime() + val * 86400000));
  }

  if (typeof val === "string") {
    if (val.startsWith("=")) {
      return null;
    }

    // Excel serial date as string
    if (/^\d+$/.test(val)) {
      const excelEpoch = new Date(1899, 11, 30);
      return inRange(new Date(excelEpoch.getTime() + Number(val) * 86400000));
    }

    const parts = val.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      return inRange(new Date(y, m - 1, d));
    }

    return inRange(new Date(val));
  }

  return null;
}

function getTrainingStatus(statusValue, expiryDate, completedDate) {
  if (!statusValue && !expiryDate && !completedDate) {
    return null;
  }

  if (typeof statusValue === "string") {
    const lower = statusValue.toLowerCase();

    if (lower.includes("if required")) {
      return "if_required";
    }

    if (lower.includes("pass")) {
      return "completed";
    }

    if (lower.includes("fail")) {
      return "failed";
    }
  }

  if (completedDate) {
    return "completed";
  }

  if (!expiryDate) {
    return "completed";
  }

  if (expiryDate.getFullYear() >= NO_EXPIRY_YEAR) {
    return "completed";
  }

  const now = new Date();

  if (expiryDate < now) {
    return "overdue";
  }

  const soon = new Date();
  soon.setDate(soon.getDate() + 90);

  if (expiryDate < soon) {
    return "due_soon";
  }

  return "completed";
}

function isEmployeeRow(row) {
  const name = row[COL.FULL_NAME_EN];

  if (!name || typeof name !== "string") {
    return false;
  }

  if (name.startsWith("=")) {
    return false;
  }

  return name.trim().length > 3;
}

// ============================================================
// Main
// ============================================================

async function importEmployeeTrainings() {
  console.log("🚀 Importing Chevron Employee Trainings...");

  // ==========================================================
  // Read Workbook
  // ==========================================================

  const workbook = xlsx.readFile(FILE_PATH, {
    cellDates: true,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  // ==========================================================
  // Client
  // ==========================================================

  const client = await prisma.client.findFirst({
    where: { name: CLIENT_NAME },
  });

  if (!client) {
    throw new Error(`Client not found: ${CLIENT_NAME}`);
  }

  // ==========================================================
  // Contract
  // ==========================================================

  const contract = await prisma.contract.findFirst({
    where: {
      clientId: client.id,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!contract) {
    throw new Error(`Contract not found: ${CLIENT_NAME}`);
  }

  // ==========================================================
  // Build Training Layout
  // ==========================================================

  const trainingLayout = [];

  const headerRow = rows[ROW.TRAINING_NAME];
  const fieldRow = rows[ROW.TRAINING_FIELD];

  for (let col = COL.TRAINING_START; col < headerRow.length; col++) {
    const trainingNameRaw = headerRow[col];
    const fieldNameRaw = fieldRow[col];

    const cleanedTrainingName = cleanText(trainingNameRaw);

    if (!cleanedTrainingName) {
      continue;
    }

    const clientTraining = await prisma.clientTraining.findFirst({
      where: {
        contractId: contract.id,
        OR: [
          { nameAlias: cleanedTrainingName },
          { globalTraining: { name: cleanedTrainingName } },
        ],
      },
      include: { globalTraining: true },
    });

    if (!clientTraining) {
      console.log(`⚠ No mapping: "${cleanedTrainingName}"`);
      continue;
    }

    const fieldName = cleanText(fieldNameRaw);

    if (!fieldName) {
      continue;
    }

    let existing = trainingLayout.find(
      (t) => t.trainingName === cleanedTrainingName,
    );

    if (!existing) {
      existing = {
        trainingName: cleanedTrainingName,
        clientTraining,
        globalTraining: clientTraining.globalTraining,
        completedCol: null,
        expiryCol: null,
        statusCol: null,
      };

      trainingLayout.push(existing);
    }

    const lower = fieldName.toLowerCase();

    if (lower.includes("completed")) {
      existing.completedCol = col;
    }

    if (lower.includes("expire")) {
      existing.expiryCol = col;
    }

    if (lower.includes("status")) {
      existing.statusCol = col;
    }
  }

  console.log(`📚 Trainings found: ${trainingLayout.length}`);

  // ==========================================================
  // Import Employee Trainings
  // ==========================================================

  let inserted = 0;
  let skipped = 0;

  const skippedEmployees = [];

  for (
    let rowIndex = ROW.EMPLOYEE_START;
    rowIndex <= ROW.EMPLOYEE_END;
    rowIndex++
  ) {
    try {
      const row = rows[rowIndex];

      if (!isEmployeeRow(row)) {
        continue;
      }

      const fullNameTH = cleanText(row[COL.FULL_NAME_TH]);
      const fullNameEN = cleanText(row[COL.FULL_NAME_EN]);

      const employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { fullNameTH },
            { fullNameEN },
            { fullName: fullNameTH },
            { fullName: fullNameEN },
          ],
        },
      });

      if (!employee) {
        skippedEmployees.push({
          fullName: fullNameTH || fullNameEN,
          row: rowIndex + 1,
        });
        skipped++;
        continue;
      }

      console.log(`\n👤 ${fullNameTH || fullNameEN}`);

      // ======================================================
      // Employee Info
      // ======================================================

      const covidVac = cleanText(row[COL.COVID_VACCINE]);

      const pdpaConsentRaw = cleanText(row[COL.PDPA_CONSENT]);
      const pdpaConsent =
        pdpaConsentRaw && pdpaConsentRaw !== "N/A" && pdpaConsentRaw !== "-"
          ? true
          : null;

      await prisma.employee.update({
        where: { id: employee.id },
        data: { covidVac, pdpaConsent },
      });

      // ======================================================
      // Medical Check
      // ======================================================

      try {
        const medicalHospital = cleanText(row[COL.MEDICAL_HOSP]);
        const medicalIssuedDate = parseDate(row[COL.MEDICAL_ISSUE]);
        const medicalExpiryDate = parseDate(row[COL.MEDICAL_EXP]);

        const medicalRequirement = await prisma.medicalRequirement.findFirst({
          where: {
            clientId: client.id,
            name: { contains: "Medical Check" },
          },
        });

        const remindDays = 30;
        const remindDate = medicalExpiryDate
          ? new Date(
              medicalExpiryDate.getTime() - remindDays * 24 * 60 * 60 * 1000,
            )
          : null;

        // ✅ status คิดจากวันหมดอายุ (เหมือน PTT) — ไม่พึ่ง column OK ที่ว่างใน CLEAN file
        let medicalStatus = "pending";
        if (medicalExpiryDate) {
          medicalStatus = medicalExpiryDate < new Date() ? "overdue" : "passed";
        }

        if ((medicalIssuedDate || medicalExpiryDate) && medicalRequirement) {
          // ✅ checkType = "Medical Check up" (มาตรฐานทั้งระบบ → EditWorker/WorkerDetail/Compliance มองเห็น)
          await prisma.medicalCheck.upsert({
            where: {
              employeeId_checkType_medicalRequirementId: {
                employeeId: employee.id,
                checkType: MEDICAL_CHECK_TYPE,
                medicalRequirementId: medicalRequirement.id,
              },
            },
            update: {
              hospital: medicalHospital,
              issuedDate: medicalIssuedDate,
              expiryDate: medicalExpiryDate,
              remindDate,
              remindDays,
              status: medicalStatus,
            },
            create: {
              employeeId: employee.id,
              medicalRequirementId: medicalRequirement.id,
              checkType: MEDICAL_CHECK_TYPE,
              hospital: medicalHospital,
              issuedDate: medicalIssuedDate,
              expiryDate: medicalExpiryDate,
              remindDate,
              remindDays,
              status: medicalStatus,
            },
          });

          console.log(`   💉 ${MEDICAL_CHECK_TYPE} (${medicalStatus})`);
        }
      } catch (err) {
        console.log(`❌ Medical Error: ${err.message}`);
      }

      // ======================================================
      // Trainings
      // ======================================================

      for (const training of trainingLayout) {
        try {
          const globalTraining = training.globalTraining;
          const clientTraining = training.clientTraining;

          const completedDate = parseDate(row[training.completedCol]);
          const expiryDate = parseDate(row[training.expiryCol]);
          const rawStatus = cleanText(row[training.statusCol]);

          const status = getTrainingStatus(
            rawStatus,
            expiryDate,
            completedDate,
          );

          if (!status && !completedDate && !expiryDate) {
            continue;
          }

          const remindDays = 30;
          const remindDate = expiryDate
            ? new Date(expiryDate.getTime() - remindDays * 24 * 60 * 60 * 1000)
            : null;

          const existing = await prisma.employeeTraining.findFirst({
            where: {
              employeeId: employee.id,
              globalTrainingId: globalTraining.id,
              contractId: contract.id,
              isLatest: true,
            },
          });

          if (existing) {
            await prisma.employeeTraining.update({
              where: { id: existing.id },
              data: { isLatest: false },
            });

            await prisma.employeeTraining.create({
              data: {
                employeeId: employee.id,
                rawTrainingName: training.trainingName,
                globalTrainingId: globalTraining.id,
                clientTrainingId: clientTraining.id,
                contractId: contract.id,
                completedDate,
                expiryDate,
                remindDate,
                remindDays,
                status,
                source: "excel_import",
                sourceFile: FILE_PATH,
                isLatest: true,
                version: (existing.version || 1) + 1,
              },
            });
          } else {
            await prisma.employeeTraining.create({
              data: {
                employeeId: employee.id,
                rawTrainingName: training.trainingName,
                globalTrainingId: globalTraining.id,
                clientTrainingId: clientTraining.id,
                contractId: contract.id,
                completedDate,
                expiryDate,
                remindDate,
                remindDays,
                status,
                source: "excel_import",
                sourceFile: FILE_PATH,
                isLatest: true,
                version: 1,
              },
            });
          }

          inserted++;
          console.log(`   ✔ ${globalTraining.name} (${status})`);
        } catch (err) {
          console.error(`❌ ${training.trainingName}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ Row ${rowIndex}: ${err.message}`);
    }
  }

  console.log("\n================================");
  console.log("✅ Import Completed");
  console.log(`✔ Inserted: ${inserted}`);

  if (skippedEmployees.length > 0) {
    console.log("\n⚠ Skipped Employees:");
    for (const item of skippedEmployees) {
      console.log(`- ${item.fullName} (row ${item.row})`);
    }
  }

  console.log(`⚠ Skipped: ${skipped}`);
}

// ============================================================
// Run
// ============================================================

importEmployeeTrainings()
  .catch((err) => {
    console.error("💥 Import failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
