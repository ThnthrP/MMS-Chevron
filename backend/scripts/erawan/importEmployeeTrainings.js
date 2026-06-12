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
  "../../../training_record_from_hr/clean/Employee Training Offshore-Erawan 31-3-2026-CLEAN.xlsx",
);

// const TRAINING_MAPPING_FILE = path.join(
//   __dirname,
//   "../../../training_record_from_hr/importErawan.xlsx",
// );

const CLIENT_NAME = "Erawan";

const SHEET_NAME = "Erawan 26-3-26";

// ============================================================
// Excel Structure
// ============================================================

const COL = {
  FULL_NAME_EN: 2,
  FULL_NAME_TH: 3,
  POSITION: 4,

  MEDICAL_HOSP: 6,
  MEDICAL_ISSUE: 7,
  MEDICAL_EXP: 8,
  MEDICAL_OK: 9,
  MEDICAL_CONFINED_SPACE: 10,

  COVID_VACCINE: 12, // M
  PDPA_CONSENT: 13, // N

  TRAINING_START: 14, // O
  TRAINING_END: 69, // BR
};

const ROW = {
  TRAINING_HEADER: 2, // row 3

  EMPLOYEE_START: 57, // row 58
  EMPLOYEE_END: 291, // row 292
};

// ============================================================
// Constants
// ============================================================

const SKIP_VALUES = new Set(["N/A", "n/a", null, undefined]);

const NO_EXPIRY_YEAR = 2099;

// ============================================================
// Helpers
// ============================================================

function cleanText(value) {
  if (!value) return null;

  return String(value).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

// ============================================================
// Date Helpers
// ============================================================

function parseDate(val) {
  if (!val) return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      return null;
    }

    return val;
  }

  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30);

    return new Date(excelEpoch.getTime() + val * 86400000);
  }

  if (typeof val === "string") {
    if (val.startsWith("=")) {
      return null;
    }

    const parts = val.split("/");

    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);

      return new Date(y, m - 1, d);
    }

    const parsed = new Date(val);

    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function getTrainingStatus(val) {
  if (!val || SKIP_VALUES.has(val)) {
    return null;
  }

  if (typeof val === "string") {
    const lower = val.toLowerCase();

    if (lower === "if required") {
      return "if_required";
    }

    if (val.startsWith("=")) {
      return null;
    }
  }

  const date = parseDate(val);

  if (!date) {
    return null;
  }

  if (date.getFullYear() >= NO_EXPIRY_YEAR) {
    return "completed";
  }

  const now = new Date();

  if (date < now) {
    return "overdue";
  }

  const soon = new Date();

  soon.setDate(soon.getDate() + 90);

  if (date < soon) {
    return "due_soon";
  }

  return "completed";
}

function isEmployeeRow(row) {
  const name = row[COL.FULL_NAME_TH];

  if (!name || typeof name !== "string") {
    return false;
  }

  if (name.startsWith("=")) {
    return false;
  }

  return name.trim().includes(" ");
}

// ============================================================
// Main
// ============================================================

async function importEmployeeTrainings() {
  console.log("🚀 Importing Employee Trainings...");

  // ==========================================================
  // Read Employee Workbook
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
  // Read Training Mapping Workbook
  // ==========================================================

  // const mappingWorkbook = xlsx.readFile(TRAINING_MAPPING_FILE);

  // const mappingSheet = mappingWorkbook.Sheets[mappingWorkbook.SheetNames[0]];

  // const TRAINING_NAME_MAP = buildTrainingMap(mappingSheet);

  // console.log(`📚 Training mappings loaded: ${TRAINING_NAME_MAP.size}`);

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
  // Build Training Column Map
  // ==========================================================

  const headerRow = rows[ROW.TRAINING_HEADER];

  const trainingColumnMap = {};

  for (let col = COL.TRAINING_START; col <= COL.TRAINING_END; col++) {
    const excelTrainingName = headerRow[col];

    if (!excelTrainingName) {
      continue;
    }

    // const canonicalName = mapTrainingName(excelTrainingName, TRAINING_NAME_MAP);
    const cleanedTrainingName = cleanText(excelTrainingName);

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

    const globalTraining = clientTraining.globalTraining;

    // trainingColumnMap[col] = {
    //   excelTrainingName,
    //   canonicalName,
    // };

    trainingColumnMap[col] = {
      excelTrainingName: cleanedTrainingName,

      clientTraining,

      globalTraining,
    };
  }

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

      // const fullName = row[COL.FULL_NAME_TH]?.trim();
      const fullNameEN = cleanText(row[COL.FULL_NAME_EN]);

      const fullNameTH = cleanText(row[COL.FULL_NAME_TH]);

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
          // fullName,
          fullName: fullNameTH || fullNameEN,

          row: rowIndex + 1,

          position: cleanText(row[COL.POSITION]),
        });

        skipped++;

        continue;
      }

      // console.log(`\n👤 ${fullName}`);
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
        where: {
          id: employee.id,
        },

        data: {
          covidVac,

          pdpaConsent,
        },
      });

      // ======================================================
      // Medical Check
      // ======================================================

      try {
        const medicalHospital = cleanText(row[COL.MEDICAL_HOSP]);

        const medicalIssuedDate = parseDate(row[COL.MEDICAL_ISSUE]);

        const medicalExpiryDate = parseDate(row[COL.MEDICAL_EXP]);

        const medicalStatusRaw = cleanText(row[COL.MEDICAL_OK]);

        const confinedSpaceRaw = cleanText(row[COL.MEDICAL_CONFINED_SPACE]);

        const medicalRequirement = await prisma.medicalRequirement.findFirst({
          where: {
            clientId: client.id,
            name: {
              contains: "Medical Check",
            },
          },
        });

        const confinedSpaceRequirement =
          await prisma.medicalRequirement.findFirst({
            where: {
              clientId: client.id,
              name: {
                contains: "Confined Space",
              },
            },
          });

        // ====================================================
        // Main Medical Checkup
        // ====================================================

        const remindDays = 30;

        const remindDate = medicalExpiryDate
          ? new Date(
              medicalExpiryDate.getTime() - remindDays * 24 * 60 * 60 * 1000,
            )
          : null;

        if (!medicalRequirement) {
          console.log("⚠ Medical requirement not found");

          // continue;
        }

        if (!confinedSpaceRequirement) {
          console.log("⚠ Confined Space requirement not found");

          // continue;
        }

        // if (medicalIssuedDate) {
        if (medicalIssuedDate && medicalRequirement) {
          await prisma.medicalCheck.upsert({
            where: {
              employeeId_checkType_medicalRequirementId: {
                employeeId: employee.id,

                checkType: "Medical Checkup",

                // medicalRequirementId: medicalRequirement?.id || null,
                medicalRequirementId: medicalRequirement.id,
              },
            },

            update: {
              hospital: medicalHospital,

              issuedDate: medicalIssuedDate,

              expiryDate: medicalExpiryDate,

              remindDate,
              remindDays,

              status:
                medicalStatusRaw?.toLowerCase() === "yes"
                  ? medicalExpiryDate && medicalExpiryDate < new Date()
                    ? "overdue"
                    : "passed"
                  : "failed",
            },

            create: {
              employeeId: employee.id,

              medicalRequirementId: medicalRequirement?.id || null,

              checkType: "Medical Checkup",

              hospital: medicalHospital,

              issuedDate: medicalIssuedDate,

              expiryDate: medicalExpiryDate,

              remindDate,
              remindDays,

              status:
                medicalStatusRaw?.toLowerCase() === "yes"
                  ? medicalExpiryDate && medicalExpiryDate < new Date()
                    ? "overdue"
                    : "passed"
                  : "failed",
            },
          });

          console.log(`   💉 Medical Checkup`);
        }

        // ====================================================
        // Confined Space
        // ====================================================

        // if (
        //   confinedSpaceRaw &&
        //   confinedSpaceRaw.toLowerCase().includes("yes")
        // )

        if (
          confinedSpaceRequirement &&
          confinedSpaceRaw &&
          confinedSpaceRaw.toLowerCase().includes("yes")
        ) {
          await prisma.medicalCheck.upsert({
            where: {
              employeeId_checkType_medicalRequirementId: {
                employeeId: employee.id,

                checkType: "Confined Space Entry",

                // medicalRequirementId: confinedSpaceRequirement?.id || null,
                medicalRequirementId: confinedSpaceRequirement.id,
              },
            },

            update: {
              issuedDate: medicalIssuedDate,

              expiryDate: medicalExpiryDate,

              remindDate,
              remindDays,

              status:
                medicalExpiryDate && medicalExpiryDate < new Date()
                  ? "overdue"
                  : "passed",
            },

            create: {
              employeeId: employee.id,

              medicalRequirementId: confinedSpaceRequirement?.id || null,

              checkType: "Confined Space Entry",

              issuedDate: medicalIssuedDate,

              expiryDate: medicalExpiryDate,

              remindDate,
              remindDays,

              status:
                medicalExpiryDate && medicalExpiryDate < new Date()
                  ? "overdue"
                  : "passed",
            },
          });

          console.log(`   💉 Confined Space`);
        }
      } catch (err) {
        console.log(`❌ Medical Error: ${err.message}`);
      }

      // ======================================================
      // Loop Training Columns
      // ======================================================

      for (const [colIndex, trainingInfo] of Object.entries(
        trainingColumnMap,
      )) {
        try {
          const cellValue = row[parseInt(colIndex)];

          if (cellValue === null || cellValue === undefined) {
            continue;
          }

          const status = getTrainingStatus(cellValue);

          const clientTraining = trainingInfo.clientTraining;

          const globalTraining = trainingInfo.globalTraining;

          if (!status) {
            continue;
          }

          // const canonicalName = trainingInfo.canonicalName;

          // if (!canonicalName) {
          //   console.log(`⚠ No mapping: "${trainingInfo.excelTrainingName}"`);

          //   continue;
          // }

          // const globalTraining = globalTrainingMap[canonicalName];

          // if (!globalTraining) {
          //   console.log(`⚠ Global training not found: ${canonicalName}`);

          //   continue;
          // }

          // const clientTraining = clientTrainingMap[canonicalName];

          const expiryDate =
            status === "if_required"
              ? null
              : (() => {
                  const parsed = parseDate(cellValue);

                  if (parsed && parsed.getFullYear() >= NO_EXPIRY_YEAR) {
                    return null;
                  }

                  return parsed;
                })();

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

                // rawTrainingName: cleanedTrainingName,
                rawTrainingName: trainingInfo.excelTrainingName,

                globalTrainingId: globalTraining.id,

                clientTrainingId: clientTraining.id,

                contractId: contract.id,

                expiryDate,

                status,

                source: "excel_import",

                sourceFile: FILE_PATH,

                isLatest: true,

                // version: 1,
                version: (existing.version || 1) + 1,
              },
            });
          } else {
            await prisma.employeeTraining.create({
              data: {
                employeeId: employee.id,

                rawTrainingName: trainingInfo.excelTrainingName,

                globalTrainingId: globalTraining.id,

                clientTrainingId: clientTraining?.id || null,

                contractId: contract.id,

                expiryDate,

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
          console.error(`❌ Training error: ${err.message}`);
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
      console.log(`- ${item.fullName} | ${item.position} | row ${item.row}`);
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
