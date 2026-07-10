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
  "../../../training_record_from_hr/clean/Employee Training Offshore Chevron Ass.Floo Operator.31-3-2026-CLEAN.xlsx",
);

const CLIENT_NAME = "Chevron";

const SHEET_NAME = "Record";

const MEDICAL_CHECK_TYPE = "Medical Check up";

// ============================================================
// Excel Structure — เฉพาะ sheet Record ของไฟล์ Assist Floor Operator
// (ต่างจากไฟล์ Chevron หลัก: ไม่มีคอลัมน์ MEDICAL_OK, ตำแหน่งคอลัมน์เลื่อนมาชิดซ้ายกว่า)
// ============================================================

const COL = {
  FULL_NAME_EN: 1, // B
  FULL_NAME_TH: 2, // C
  POSITION: 3, // D  (ไม่ใช้ match อะไร — แค่ข้อมูลอ้างอิง)

  MEDICAL_HOSP: 5, // F
  MEDICAL_ISSUE: 6, // G
  MEDICAL_EXP: 7, // H

  COVID_VACCINE: 10, // K

  PDPA_CONSENT: 11, // L

  TRAINING_START: 12, // M — ยืนยันแล้วว่าถูกต้อง (ทดสอบ 13 แล้วอ่านไม่ตรง)
};

const ROW = {
  TRAINING_NAME: 3, // row 4
  TRAINING_FIELD: 5, // row 6

  EMPLOYEE_START: 6, // row 7
  EMPLOYEE_END: 17, // row 18  (12 คน: row 7-18)
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

    // ⚠ ต้องเช็คก่อนอย่างอื่น — ถ้า status เป็น "pending" ชัดเจน แปลว่ายังไม่ทำ
    // แม้ completedDate/expiryDate cell จะมีค่า (สูตร Excel fallback ไปวันที่ default
    // เมื่อยังไม่เสร็จ) ก็ไม่ควรนับว่า completed
    if (lower.includes("pending")) {
      return null;
    }

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

// ⚠ Completed date / Expire date บางเซลล์เป็นสูตร Excel ที่แสดงข้อความ
// "Pending" / "N/A" / "-" ตรงๆ แทนวันที่ (ยังไม่เคยทำจริง) — ต้องเช็คค่า
// ในเซลล์นั้นเองก่อนเสมอ ไม่พึ่ง Status column อย่างเดียว เพราะ Status
// column อาจถูก map ผิดคอลัมน์ได้จาก merge cell ที่ไม่ตรงแนว
const DATE_PLACEHOLDER_TEXTS = new Set([
  "pending",
  "n/a",
  "na",
  "-",
  "tbd",
  "",
]);

function isDatePlaceholder(raw) {
  const t = cleanText(raw);
  if (!t) return true; // ว่างเปล่า = ไม่ใช่วันที่ แน่นอน
  return DATE_PLACEHOLDER_TEXTS.has(t.toLowerCase());
}

// ============================================================
// Main
// ============================================================

async function importEmployeeTrainingsAssFlooOperator() {
  console.log(
    "🚀 Importing Chevron Employee Trainings (Assist Floor Operator)...",
  );

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
  // Client / Contract
  // ==========================================================

  const client = await prisma.client.findFirst({
    where: { name: CLIENT_NAME },
  });

  if (!client) {
    throw new Error(`Client not found: ${CLIENT_NAME}`);
  }

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

  // ⚠ header ของแต่ละ training เป็น merged cell ครอบหลายคอลัมน์ย่อย
  // (Completed date / Expire date / Remind date / Status) — Excel เก็บชื่อ
  // training ไว้แค่คอลัมน์ซ้ายสุดของ merge เท่านั้น คอลัมน์ย่อยที่เหลือ
  // จะอ่านได้ค่าว่าง จึงต้อง "จำชื่อ training ล่าสุด" ไว้ (forward-fill)
  // แทนที่จะข้ามคอลัมน์ที่ header ว่าง ไม่งั้น completedCol/expiryCol/
  // statusCol จะไม่เคยถูกตั้งค่าให้คอลัมน์ย่อยที่ไม่ใช่คอลัมน์แรกของ merge
  // ⚠ ชื่อ training บาง header ในไฟล์ Excel มี line break ซ่อนอยู่กลางคำ
  // (Alt+Enter ที่พิมพ์ผิดตำแหน่ง) ทำให้ cleanText() อ่านได้ชื่อแหว่ง
  // ไม่ตรงกับ ClientTraining ตัวไหนเลย ("No mapping") — แก้ตรงนี้แทนการ
  // ไปแก้ merged cell ในไฟล์ Excel ซึ่งเสี่ยงกระทบคอลัมน์ข้างเคียง
  const HEADER_TEXT_ALIASES = {
    "Safety Orientation - Incident R eporting,":
      "Safety Orientation - Incident Reporting",
  };

  function fixHeaderText(text) {
    return HEADER_TEXT_ALIASES[text] || text;
  }

  let lastTrainingName = null;

  for (let col = COL.TRAINING_START; col < headerRow.length; col++) {
    const trainingNameRaw = headerRow[col];
    const fieldNameRaw = fieldRow[col];

    const trainingNameInCell = fixHeaderText(cleanText(trainingNameRaw));
    if (trainingNameInCell) {
      lastTrainingName = trainingNameInCell; // เจอ header ใหม่ → อัปเดต anchor
    }

    const cleanedTrainingName = lastTrainingName;

    if (!cleanedTrainingName) {
      continue; // ยังไม่เจอ training context เลย (เช่นคอลัมน์ก่อนเริ่ม training แรก)
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
      // Employee Info (Covid / PDPA)
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

        let medicalStatus = "pending";
        if (medicalExpiryDate) {
          medicalStatus = medicalExpiryDate < new Date() ? "overdue" : "passed";
        }

        if ((medicalIssuedDate || medicalExpiryDate) && medicalRequirement) {
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

          const completedRaw = row[training.completedCol];
          const expiryRaw = row[training.expiryCol];
          const rawStatus = cleanText(row[training.statusCol]);

          // ⚠ เช็คที่ตัว cell เองก่อนเป็นอันดับแรก — ถ้า cell ของ completed/expiry
          // แสดงข้อความ placeholder (Pending, N/A, -, ว่าง) ตรงๆ ให้ทิ้งเป็น null
          // ทันที ไม่ต้องพยายาม parseDate เลย (กันกรณี parseDate เผลอตีความ
          // ข้อความแปลกๆ เป็นวันที่ผิด และไม่ต้องพึ่ง Status column อย่างเดียว)
          const completedDate = isDatePlaceholder(completedRaw)
            ? null
            : parseDate(completedRaw);
          const expiryDate = isDatePlaceholder(expiryRaw)
            ? null
            : parseDate(expiryRaw);

          const status = getTrainingStatus(
            rawStatus,
            expiryDate,
            completedDate,
          );

          const remindDays = 30;
          const remindDate = expiryDate
            ? new Date(expiryDate.getTime() - remindDays * 24 * 60 * 60 * 1000)
            : null;

          // ⚠ ใช้ findMany แทน findFirst — เพราะพบว่า DB มี record isLatest:true
          // ซ้อนกันมากกว่า 1 ตัวต่อ (employeeId, globalTrainingId, contractId)
          // ในบางเคส (เช่น ตัวหนึ่งจาก source:"demo_seed" ที่ seed ไว้ตั้งแต่แรก
          // อีกตัวจาก excel_import ของเรา) — ถ้าใช้ findFirst จะจับได้แค่ตัวเดียว
          // แล้วปล่อยอีกตัวค้างเป็น isLatest:true ต่อไป ทำให้ดูเหมือนแก้ไม่หาย
          // ⚠ ไม่กรอง contractId ตรงนี้ — เจอมาแล้วว่า record บางตัว (source:
          // "demo_seed") มี contractId เป็น null ต่างจาก contract ปัจจุบัน
          // (CHV-2025) ถ้ากรอง contractId ด้วยจะไม่มีทางเจอ demo_seed เลย
          // ทำให้ค้างเป็น isLatest:true คู่กับ record ใหม่ตลอดไป — หน้า UI
          // ถือว่า "isLatest" คือ 1 ต่อ (employeeId, globalTrainingId) เท่านั้น
          // ไม่สนใจ contract จึงต้อง match แบบเดียวกันตรงนี้
          const existingRecords = await prisma.employeeTraining.findMany({
            where: {
              employeeId: employee.id,
              globalTrainingId: globalTraining.id,
              isLatest: true,
            },
          });

          // ⚠ เช็ค existing ก่อนตัดสินใจข้าม — ถ้าไม่มีข้อมูลจริงตอนนี้
          // (pending) แต่มี record เก่าที่เคยสร้างผิดค้างอยู่ (isLatest:true)
          // ต้อง "แก้" ให้ถูกด้วย (mark false + สร้างใหม่เป็น null) ไม่ใช่แค่
          // ข้ามเฉยๆ ไม่งั้น record ผิดจากรอบก่อนจะค้างเป็น isLatest:true ตลอดไป
          if (
            !status &&
            !completedDate &&
            !expiryDate &&
            existingRecords.length === 0
          ) {
            continue; // ไม่มีข้อมูลจริง และไม่มี record เก่าที่ต้องแก้ — ข้ามได้จริง
          }

          if (existingRecords.length > 0) {
            // mark ทุกตัวที่ isLatest:true เดิม (ไม่ว่าจะมีกี่ตัวซ้อนกัน) เป็น false ทั้งหมด
            await prisma.employeeTraining.updateMany({
              where: {
                employeeId: employee.id,
                globalTrainingId: globalTraining.id,
                isLatest: true,
              },
              data: { isLatest: false },
            });

            const maxVersion = existingRecords.reduce(
              (max, r) => Math.max(max, r.version || 1),
              0,
            );

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
                status: status ?? "pending",
                source: "excel_import",
                sourceFile: FILE_PATH,
                isLatest: true,
                version: maxVersion + 1,
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
                status: status ?? "pending",
                source: "excel_import",
                sourceFile: FILE_PATH,
                isLatest: true,
                version: 1,
              },
            });
          }

          inserted++;
          console.log(`   ✔ ${globalTraining.name} (${status ?? "pending"})`);
        } catch (err) {
          console.error(`❌ ${training.trainingName}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ Row ${rowIndex}: ${err.message}`);
    }
  }

  console.log("\n================================");
  console.log("✅ Import Completed (Assist Floor Operator)");
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

importEmployeeTrainingsAssFlooOperator()
  .catch((err) => {
    console.error("💥 Import failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
