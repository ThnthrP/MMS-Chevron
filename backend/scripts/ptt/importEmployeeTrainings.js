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
  "../../../training_record_from_hr/clean/Employee Training Offshore-PTT 31-3-2026-CLEAN.xlsx",
);

const TRAINING_MAPPING_FILE = path.join(
  __dirname,
  "../../../training_record_from_hr/importPTT.xlsx",
);

const CLIENT_NAME = "PTT";

const SHEET_NAME = "PTT (Matrixใหม่) (28-2-26";

// ============================================================
// Excel Structure
// ============================================================

const COL = {
  FULL_NAME_EN: 1, // B
  FULL_NAME_TH: 2, // C
  POSITION: 3, // D

  TRAINING_START: 7, // H
  TRAINING_END: 89, // CL

  // ==========================================
  // Medical
  // ==========================================

  MEDICAL_EXP: 91, // CN
  MEDICAL_STATUS: 92, // CO
  MEDICAL_HOSPITAL: 93, // CP
  MEDICAL_FORM: 94, // CQ

  COVID_VACCINE: 95, // CR
};

const ROW = {
  TRAINING_NAME: 4, // row 5
  TRAINING_FIELD: 5, // row 6

  EMPLOYEE_START: 7, // row 8
  EMPLOYEE_END: 194, // row 195
};

// ============================================================
// Constants
// ============================================================

// const SKIP_VALUES = new Set(["N/A", "n/a", null, undefined, ""]);

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

function normalizeTraining(trainingName, trainingMap) {
  if (!trainingName) {
    return null;
  }

  const cleaned = cleanText(trainingName);

  return trainingMap.get(cleaned) || cleaned;
}

// ============================================================
// Date Helpers
// ============================================================

function parseDate(val) {
  if (!val) return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30);

    const date = new Date(excelEpoch.getTime() + val * 86400000);

    if (date.getFullYear() > 2100) {
      return null;
    }

    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof val === "string") {
    if (val.startsWith("=")) {
      return null;
    }

    // ==========================================
    // Excel Serial Date as String
    // ==========================================

    if (/^\d+$/.test(val)) {
      const excelEpoch = new Date(1899, 11, 30);

      const date = new Date(excelEpoch.getTime() + Number(val) * 86400000);

      return isNaN(date.getTime()) ? null : date;
    }

    const parts = val.split("/");

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

// function getTrainingStatus(statusValue, expiryDate, completedDate) {
function getTrainingStatus(expiryDate, completedDate) {
  if (!expiryDate && !completedDate) {
    return null;
  }

  if (expiryDate) {
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

  if (completedDate) {
    return "completed";
  }

  return null;
}

function isEmployeeRow(row) {
  const fullNameEN = cleanText(row[COL.FULL_NAME_EN]);

  const fullNameTH = cleanText(row[COL.FULL_NAME_TH]);

  const position = cleanText(row[COL.POSITION]);

  // ต้องมีอย่างน้อยชื่อใดชื่อหนึ่ง
  if (!fullNameEN && !fullNameTH) {
    return false;
  }

  // ต้องมี position
  if (!position) {
    return false;
  }

  // กัน section header rows
  if (fullNameEN === position || fullNameTH === position) {
    return false;
  }

  return true;
}

// ============================================================
// Main
// ============================================================

async function importEmployeeTrainings() {
  //   console.log("🚀 Importing Chevron Employee Trainings...");
  console.log("🚀 Importing PTT Employee Trainings...");

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

  const mappingWorkbook = xlsx.readFile(TRAINING_MAPPING_FILE);

  const mappingSheet = mappingWorkbook.Sheets[mappingWorkbook.SheetNames[0]];

  const TRAINING_NAME_MAP = buildTrainingMap(mappingSheet);

  console.log(`📚 Training mappings loaded: ${TRAINING_NAME_MAP.size}`);

  // ==========================================================
  // Client
  // ==========================================================

  const client = await prisma.client.findFirst({
    where: {
      name: CLIENT_NAME,
    },
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

    orderBy: {
      createdAt: "desc",
    },
  });

  if (!contract) {
    throw new Error(`Contract not found: ${CLIENT_NAME}`);
  }

  // ==========================================================
  // Build Training Layout
  // ==========================================================

  //   const trainingLayout = [];
  const trainingLayout = {};
  // ----
  const missingMappings = [];

  const detectedTrainings = [];
  // ----
  const headerRow = rows[ROW.TRAINING_NAME];

  const fieldRow = rows[ROW.TRAINING_FIELD];

  //   for (let col = COL.TRAINING_START; col < headerRow.length; col++) {
  for (let col = COL.TRAINING_START; col <= COL.TRAINING_END; col++) {
    const trainingNameRaw = headerRow[col];

    // console.log(col, JSON.stringify(trainingNameRaw));

    const fieldNameRaw = fieldRow[col];

    // const cleanedTrainingName = cleanText(trainingNameRaw);
    const cleanedTrainingName = normalizeTraining(
      trainingNameRaw,
      TRAINING_NAME_MAP,
    );

    if (!cleanedTrainingName) {
      continue;
    }

    const clientTraining = await prisma.clientTraining.findFirst({
      where: {
        contractId: contract.id,

        // name: cleanedTrainingName,
        globalTraining: {
          is: {
            name: cleanedTrainingName,
          },
        },
      },

      include: {
        globalTraining: true,
      },
    });

    if (!clientTraining) {
      //   console.log(`⚠ No mapping: "${cleanedTrainingName}"`);
      missingMappings.push(cleanedTrainingName);

      continue;
    }

    // const fieldName = cleanText(fieldNameRaw);
    let fieldName = cleanText(fieldNameRaw);

    if (!fieldName) {
      fieldName = "Training Date";
    }

    // console.log(cleanedTrainingName, "=>", fieldName);

    if (!fieldName) {
      fieldName = "Training Date";
    }

    if (!fieldName) {
      continue;
    }

    // let existing = trainingLayout.find(
    //   (t) => t.trainingName === cleanedTrainingName,
    // );
    if (!trainingLayout[cleanedTrainingName]) {
      trainingLayout[cleanedTrainingName] = {
        trainingName: cleanedTrainingName,

        clientTraining,

        globalTraining: clientTraining.globalTraining,

        rawTrainingCol: null,

        completedCol: null,

        expiryCol: null,

        statusCol: null,

        instituteCol: null,
      };
    }

    const existing = trainingLayout[cleanedTrainingName];

    // ----
    detectedTrainings.push({
      training: cleanedTrainingName,
      field: fieldName,
    });
    // ----
    // if (!existing) {
    //   existing = {
    //     trainingName: cleanedTrainingName,

    //     clientTraining,

    //     globalTraining: clientTraining.globalTraining,

    //     completedCol: null,
    //     expiryCol: null,
    //     statusCol: null,
    //   };

    //   trainingLayout.push(existing);
    // }

    const lower = fieldName.toLowerCase();

    // if (lower.includes("completed")) {
    //   existing.completedCol = col;
    // }

    // if (lower.includes("expire")) {
    //   existing.expiryCol = col;
    // }

    // if (lower.includes("status")) {
    //   existing.statusCol = col;
    // }
    if (lower.includes("raw")) {
      existing.rawTrainingCol = col;
    }

    // if (lower.includes("training date") || lower.includes("completed")) {
    //   existing.completedCol = col;
    // }

    if (
      lower.includes("training") ||
      lower.includes("completed") ||
      lower === "date" ||
      lower.includes("date")
    ) {
      existing.completedCol = col;
    }

    if (lower.includes("expiry")) {
      existing.expiryCol = col;
    }

    if (lower.includes("status")) {
      existing.statusCol = col;
    }

    if (lower.includes("institute")) {
      existing.instituteCol = col;
    }
  }

  //   console.log(`📚 Trainings found: ${trainingLayout.length}`);
  console.log(`📚 Trainings found: ${Object.keys(trainingLayout).length}`);

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
            fullNameTH
              ? {
                  fullNameTH,
                }
              : undefined,

            fullNameEN
              ? {
                  fullNameEN,
                }
              : undefined,

            fullNameTH
              ? {
                  fullName: fullNameTH,
                }
              : undefined,

            fullNameEN
              ? {
                  fullName: fullNameEN,
                }
              : undefined,
          ].filter(Boolean),
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

      //   const pdpaConsent =
      //     cleanText(row[COL.PDPA_CONSENT])?.toUpperCase() || null;

      await prisma.employee.update({
        where: {
          id: employee.id,
        },

        data: {
          covidVac,

          //   pdpaConsent,
        },
      });

      // ======================================================
      // Medical Check
      // ======================================================

      try {
        const medicalHospital = cleanText(row[COL.MEDICAL_HOSPITAL]);

        const medicalExpiryDate = parseDate(row[COL.MEDICAL_EXP]);

        // const medicalStatusRaw = cleanText(row[COL.MEDICAL_STATUS]);

        const medicalForm = cleanText(row[COL.MEDICAL_FORM]);

        const medicalIssuedDate = null;

        const medicalRequirement = await prisma.medicalRequirement.findFirst({
          where: {
            clientId: client.id,

            name: {
              contains: "Medical",
            },
          },
        });

        const remindDays = 30;

        const remindDate = medicalExpiryDate
          ? new Date(
              medicalExpiryDate.getTime() - remindDays * 24 * 60 * 60 * 1000,
            )
          : null;

        let medicalStatus = "pending";

        if (medicalExpiryDate) {
          if (medicalExpiryDate < new Date()) {
            medicalStatus = "overdue";
          } else {
            medicalStatus = "passed";
          }
        }

        // if (medicalIssuedDate && medicalRequirement) {
        // if (medicalRequirement) {
        if ((medicalIssuedDate || medicalExpiryDate) && medicalRequirement) {
          await prisma.medicalCheck.upsert({
            where: {
              employeeId_checkType_medicalRequirementId: {
                employeeId: employee.id,

                checkType: "Medical Checkup",

                medicalRequirementId: medicalRequirement.id,
              },
            },

            update: {
              hospital: medicalHospital,

              formType: medicalForm,

              issuedDate: medicalIssuedDate,

              expiryDate: medicalExpiryDate,

              remindDate,
              remindDays,

              //   status:
              //     medicalStatusRaw?.toLowerCase() === "pass"
              //       ? medicalExpiryDate && medicalExpiryDate < new Date()
              //         ? "overdue"
              //         : "passed"
              //       : "failed",
              status: medicalStatus,
            },

            create: {
              employeeId: employee.id,

              medicalRequirementId: medicalRequirement.id,

              checkType: "Medical Checkup",

              hospital: medicalHospital,

              formType: medicalForm,

              issuedDate: medicalIssuedDate,

              expiryDate: medicalExpiryDate,

              remindDate,
              remindDays,

              //   status:
              //     medicalStatusRaw?.toLowerCase() === "pass"
              //       ? medicalExpiryDate && medicalExpiryDate < new Date()
              //         ? "overdue"
              //         : "passed"
              //       : "failed",
              status: medicalStatus,
            },
          });

          console.log(`   💉 Medical Checkup`);
        }
      } catch (err) {
        console.log(`❌ Medical Error: ${err.message}`);
      }

      // ======================================================
      // Trainings
      // ======================================================

      //   for (const training of trainingLayout)
      for (const training of Object.values(trainingLayout)) {
        try {
          const globalTraining = training.globalTraining;

          const clientTraining = training.clientTraining;

          //   const completedDate = parseDate(row[training.completedCol]);

          //   const expiryDate = parseDate(row[training.expiryCol]);

          //   const rawStatus = cleanText(row[training.statusCol]);
          const completedDate = training.completedCol
            ? parseDate(row[training.completedCol])
            : null;

          const expiryDate = training.expiryCol
            ? parseDate(row[training.expiryCol])
            : null;

          //   const rawStatus = training.statusCol
          //     ? cleanText(row[training.statusCol])
          //     : null;

          const institute = training.instituteCol
            ? cleanText(row[training.instituteCol])
            : null;

          const status = getTrainingStatus(
            // rawStatus,
            // null,
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

          // ==================================================
          // Existing Latest
          // ==================================================

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
              where: {
                id: existing.id,
              },

              data: {
                isLatest: false,
              },
            });

            await prisma.employeeTraining.create({
              data: {
                employeeId: employee.id,

                // rawTrainingName: training.trainingName,
                rawTrainingName:
                  (training.rawTrainingCol
                    ? cleanText(row[training.rawTrainingCol])
                    : null) || training.trainingName,

                globalTrainingId: globalTraining.id,

                clientTrainingId: clientTraining.id,

                contractId: contract.id,

                completedDate,
                expiryDate,

                institute,

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

                // rawTrainingName: training.trainingName,
                rawTrainingName:
                  (training.rawTrainingCol
                    ? cleanText(row[training.rawTrainingCol])
                    : null) || training.trainingName,

                globalTrainingId: globalTraining.id,

                clientTrainingId: clientTraining.id,

                contractId: contract.id,

                completedDate,
                expiryDate,

                institute,

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

  // ======================================================
  // Training Layout Summary
  // ======================================================

  console.log("\n📚 Trainings Detected:");

  const uniqueDetected = [
    ...new Map(
      detectedTrainings.map((x) => [`${x.training}-${x.field}`, x]),
    ).values(),
  ];

  for (const item of uniqueDetected) {
    console.log(`- ${item.training} => ${item.field}`);
  }

  // ======================================================
  // Missing Mapping Summary
  // ======================================================

  if (missingMappings.length > 0) {
    console.log("\n⚠ Missing Training Mappings:");

    const uniqueMissing = [...new Set(missingMappings)];

    for (const item of uniqueMissing) {
      console.log(`- ${item}`);
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
