import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Config
// ============================================================

// ⚠️ ปรับตาม path จริงของ script (สมมติ script อยู่ที่ backend/scripts/)
// MMS-Chevron/
// ├── backend/
// │   └── scripts/importEmployeeTrainings.js   ← ไฟล์นี้
// └── training_record_from_hr/
//     └── Test Training matrix Chv.xlsx
const FILE_PATH = path.join(
  __dirname,
  "../../training_record_from_hr/Test Training matrix Chv.xlsx",
);

const CLIENT_NAME = "Chevron";

// ⚠️ ไฟล์ใหม่มี sheet เดียว ชื่อ "Sheet1" (ไม่ใช่ "Record" แบบไฟล์เก่า)
const SHEET_NAME = "Sheet1";

// ============================================================
// CLI args — สำหรับทดสอบก่อนรันจริงทั้งไฟล์
//   --dry-run          : ไม่เขียนอะไรลง DB จริง แค่ log ว่าจะทำอะไร
//   --only=<empId>      : ประมวลผลเฉพาะพนักงานที่ col B (ID Employee) ตรงค่านี้
// ตัวอย่าง: node importEmployeeTrainings.js --dry-run --only=38561733
// ============================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY_EMP_ID =
  (args.find((a) => a.startsWith("--only=")) || "").split("=")[1] || null;

if (DRY_RUN) {
  console.log("🧪 DRY RUN MODE — จะไม่เขียนอะไรลง DB จริง แค่ log ให้ดู");
}
if (ONLY_EMP_ID) {
  console.log(`🎯 ONLY MODE — ประมวลผลเฉพาะ ID Employee = "${ONLY_EMP_ID}"`);
}

// checkType มาตรฐานทั้งระบบ (ตรงกับ schema/createMedical/EditWorker/Compliance)
const MEDICAL_CHECK_TYPE = "Medical Check up";

// checkType สำหรับชุดตรวจสุขภาพที่ 2 (col M-Q ในไฟล์ใหม่ — "Hospital2" group)
// ⚠️ ตั้งชื่อ "Medical Check up 2" ให้สอดคล้องกับ pattern เดิม (Medical Check up,
// Confined Space Entry) — ถ้าจะเปลี่ยนชื่อ ต้องแก้ให้ตรงกันทั้ง 3 จุด:
// 1) ค่านี้ 2) EditWorker.jsx (norm(m.checkType) === "medicalcheckup2")
// 3) label ที่โชว์ใน dropdown ของ EditWorker.jsx
const MEDICAL_CHECK_TYPE_2 = "Medical Check up 2";

// ============================================================
// Excel Structure — single-row header (col A ... HM)
// ไม่มี merged cell แล้ว ไม่ต้องใช้ไฟล์ -CLEAN แยกอีกต่อไป
// ============================================================

// index เป็น 0-based (A=0, B=1, ...)
const COL = {
  ITEM: 0, // A
  ID_EMPLOYEE: 1, // B  ← "ID Employee" ฝั่ง Chevron → Employee.empId (ไม่ใช่ Employee.empCode)
  NAME_EN: 2, // C
  NAME_TH: 3, // D
  POSITION: 4, // E
  STATUS_ALERT: 5, // F

  MEDICAL_HOSP: 6, // G
  MEDICAL_ISSUE: 7, // H
  MEDICAL_EXP: 8, // I
  MEDICAL_REMIND: 9, // J
  MEDICAL_STATUS: 10, // K

  COVID_VACCINE: 11, // L

  // ✅ col M-Q: ชุดตรวจสุขภาพที่ 2 — import เป็น MedicalCheck แยก checkType
  // ("Medical Check up 2") คู่ขนานกับ Medical Check up ตัวแรก
  MEDICAL2_HOSP: 12, // M
  MEDICAL2_ISSUE: 13, // N
  MEDICAL2_EXP: 14, // O
  MEDICAL2_REMIND: 15, // P
  MEDICAL2_STATUS: 16, // Q

  // ❌ col R-W (Drug test panel) — ตัดสินใจข้าม ไม่ import
  // ข้อมูลสุขภาพส่วนนี้ถูกเพิ่มไว้แล้วในไฟล์อื่นแยกต่างหาก
  // ไฟล์นี้เน้นเฉพาะ training certs + medical checkup เท่านั้น

  PASSPORT_NO: 23, // X
  PASSPORT_ISSUE: 24, // Y
  PASSPORT_EXP: 25, // Z
  PASSPORT_REMIND: 26, // AA — ⚠️ schema Passport ยังไม่มี remindDate (schema gap #2)
  PASSPORT_STATUS: 27, // AB

  PDPA_CONSENT: 28, // AC

  TRAINING_START: 29, // AD — จุดเริ่มต้นของ training columns ทั้งหมด
};

const ROW = {
  HEADER: 0, // แถวเดียว ไม่มี merged cell แล้ว
  EMPLOYEE_START: 1, // แถวข้อมูลพนักงานแถวแรก
};

// ============================================================
// Constants
// ============================================================

const NO_EXPIRY_YEAR = 2099;

// suffix ที่ตัดออกจาก header เพื่อได้ training name ล้วนๆ
// รองรับเลขต่อท้ายแบบไม่คงที่ เช่น "Completed date310", "Status1", "Status313"
const FIELD_SUFFIX_RE = /-(Completed date|Expire Date|Remind date|Status)\d*$/i;

// ตัดวงเล็บบอกระยะเวลา/การหมดอายุท้ายชื่อออกไปด้วย เช่น
// "(3 Year)", "(2 , 3 Year)", "(No expire)" — ให้เหลือแค่ชื่อ training ล้วนๆ
// เพื่อให้ตรงกับ GlobalTraining.name ได้โดยตรง (ไม่ต้องพึ่ง nameAlias
// สำหรับ training ส่วนใหญ่ ยกเว้นตัวที่ต่างกันจริงๆ เช่น ปั้นจั่น/QGT/BOSIET)
// หมายเหตุ: ไม่ตัดวงเล็บอื่นที่เป็นส่วนหนึ่งของชื่อจริง เช่น "(Basic IE)",
// "(International/Dimet/Jotun)" — ตัดเฉพาะวงเล็บสุดท้ายที่ตรง pattern นี้เท่านั้น
const PERIOD_SUFFIX_RE =
  /\s*\(\s*(?:\d+\s*,?\s*)*(?:\d+\s*Year|No\s*expire)\s*\)\s*$/i;

// ============================================================
// Helpers
// ============================================================

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const s = String(value)
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > 0 ? s : null;
}

function isBlankLike(text) {
  if (!text) return true;
  const t = text.trim();
  return t === "" || t === "-" || t === "N/A" || t === "#VALUE!";
}

// ============================================================
// Date Helpers
// ============================================================

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
    const trimmed = val.trim();

    if (trimmed.startsWith("=") || isBlankLike(trimmed)) {
      return null;
    }

    // Excel serial date เก็บเป็น string (เช่น "45879")
    if (/^\d+$/.test(trimmed)) {
      const excelEpoch = new Date(1899, 11, 30);
      return inRange(
        new Date(excelEpoch.getTime() + Number(trimmed) * 86400000),
      );
    }

    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      return inRange(new Date(y, m - 1, d));
    }

    return inRange(new Date(trimmed));
  }

  return null;
}

// ✅ ไม่รับ status/remind date จาก Excel แล้ว — คำนวณ status ล้วนๆ
// จาก completedDate/expiryDate (เหมือน logic ของ Medical Check up)
function getTrainingStatus(expiryDate, completedDate) {
  if (!expiryDate && !completedDate) {
    return null;
  }

  if (completedDate) return "completed";

  if (!expiryDate) return "completed";

  if (expiryDate.getFullYear() >= NO_EXPIRY_YEAR) return "completed";

  const now = new Date();
  if (expiryDate < now) return "overdue";

  const soon = new Date();
  soon.setDate(soon.getDate() + 90);
  if (expiryDate < soon) return "due_soon";

  return "completed";
}

function isEmployeeRow(row) {
  const empId = row?.[COL.ID_EMPLOYEE];
  const nameEn = row?.[COL.NAME_EN];

  if (!empId || isBlankLike(cleanText(String(empId)))) return false;
  if (!nameEn || typeof nameEn !== "string") return false;
  if (nameEn.trim().startsWith("=")) return false;

  return true;
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
    throw new Error(
      `Sheet not found: ${SHEET_NAME} (available: ${Object.keys(workbook.Sheets).join(", ")})`,
    );
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
    where: { clientId: client.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!contract) {
    throw new Error(`Contract not found: ${CLIENT_NAME}`);
  }

  const medicalRequirement = await prisma.medicalRequirement.findFirst({
    where: { clientId: client.id, name: { contains: "Medical Check" } },
  });

  if (!medicalRequirement) {
    console.log(
      `⚠ No MedicalRequirement found for "Medical Check" — Medical Check up records will be skipped`,
    );
  }

  // ==========================================================
  // Build Training Layout — single-row header, regex parsed
  // ==========================================================

  const headerRow = rows[ROW.HEADER];

  const trainingLayout = [];
  const layoutByName = new Map();

  for (let col = COL.TRAINING_START; col < headerRow.length; col++) {
    const rawHeader = cleanText(headerRow[col]);
    if (!rawHeader) continue;

    const match = rawHeader.match(FIELD_SUFFIX_RE);
    if (!match) {
      // header ไม่เข้ารูปแบบที่รู้จัก (ไม่มี -Completed date/-Expire Date/
      // -Remind date/-Status ต่อท้าย) — log ไว้เผื่อเป็นคอลัมน์แปลกที่หลุดมา
      console.log(
        `⚠ Unrecognized training header at col ${col}: "${rawHeader}"`,
      );
      continue;
    }

    const nameBeforeSuffix = rawHeader.slice(0, match.index).trim();
    const trainingName = nameBeforeSuffix.replace(PERIOD_SUFFIX_RE, "").trim();
    const fieldType = match[1].toLowerCase(); // "completed date" | "expire date" | "remind date" | "status"

    // ✅ อ่านแค่ Completed date (= issued date) กับ Expire Date เท่านั้น
    // Remind date กับ Status ไม่ต้องอ่านจาก Excel — คำนวณเองจาก
    // completedDate/expiryDate แทน (เหมือนที่ทำกับ Medical Check up อยู่แล้ว)
    if (fieldType.startsWith("completed") || fieldType.startsWith("expire")) {
      let layout = layoutByName.get(trainingName);
      if (!layout) {
        layout = {
          trainingName,
          completedCol: null,
          expiryCol: null,
          clientTraining: null,
          globalTraining: null,
        };
        layoutByName.set(trainingName, layout);
        trainingLayout.push(layout);
      }

      if (fieldType.startsWith("completed")) layout.completedCol = col;
      else layout.expiryCol = col;
    }
    // remind date / status column: เจอแล้วแต่ไม่ต้องเก็บ ไม่ต้อง warn
  }

  // Resolve ClientTraining / GlobalTraining mapping ต่อ training
  for (const layout of trainingLayout) {
    const clientTraining = await prisma.clientTraining.findFirst({
      where: {
        contractId: contract.id,
        OR: [
          { nameAlias: layout.trainingName },
          { globalTraining: { name: layout.trainingName } },
        ],
      },
      include: { globalTraining: true },
    });

    if (!clientTraining) {
      console.log(`⚠ No mapping: "${layout.trainingName}"`);
      continue;
    }

    layout.clientTraining = clientTraining;
    layout.globalTraining = clientTraining.globalTraining;
  }

  const mappedLayout = trainingLayout.filter((l) => l.globalTraining);
  console.log(
    `📚 Trainings found: ${trainingLayout.length} (mapped: ${mappedLayout.length}, unmapped: ${trainingLayout.length - mappedLayout.length})`,
  );

  // ==========================================================
  // Import Employees
  // ==========================================================

  let inserted = 0;
  let skipped = 0;
  const skippedEmployees = [];

  for (let rowIndex = ROW.EMPLOYEE_START; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    try {
      if (!isEmployeeRow(row)) continue;

      const empId = cleanText(String(row[COL.ID_EMPLOYEE]));
      const fullNameEN = cleanText(row[COL.NAME_EN]);
      const fullNameTH = cleanText(row[COL.NAME_TH]);

      // ── --only filter: ข้ามทุกแถวที่ไม่ใช่คนที่ระบุ ──
      if (ONLY_EMP_ID && empId !== ONLY_EMP_ID) continue;

      // ✅ match ด้วย empId ก่อน (เร็ว/แม่นยำสุด — ใช้ได้ตั้งแต่รอบที่ 2
      // เป็นต้นไป เพราะรอบแรก field นี้ยังว่างอยู่ทุกคน)
      let employee = await prisma.employee.findUnique({
        where: { empId },
      });

      // Fallback รอบแรก: ยังไม่มี empId ผูกไว้ → หาแบบเทียบชื่อแทน
      // (เหมือน logic ของสคริปต์เวอร์ชันเก่า) แล้ว backfill empId ให้
      // เพื่อให้รันครั้งถัดไป match ผ่าน empId ได้ตรงๆ ไม่ต้องพึ่งชื่ออีก
      if (!employee) {
        employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { fullNameTH },
              { fullNameEN },
              { fullName: fullNameTH },
              { fullName: fullNameEN },
            ],
          },
        });

        if (employee) {
          if (DRY_RUN) {
            console.log(
              `   🧪 [dry-run] would backfill empId="${empId}" for ${employee.empCode} (matched by name)`,
            );
          } else {
            employee = await prisma.employee.update({
              where: { id: employee.id },
              data: { empId },
            });
            console.log(
              `   🔗 Backfilled empId="${empId}" for ${employee.empCode} (matched by name)`,
            );
          }
        }
      }

      if (!employee) {
        skippedEmployees.push({
          empId,
          fullName: fullNameEN || fullNameTH,
          row: rowIndex + 1,
        });
        skipped++;
        continue;
      }

      console.log(
        `\n👤 [${employee.empCode} / Chevron:${empId}] ${fullNameEN || fullNameTH}`,
      );

      // ======================================================
      // Employee Info (COVID / PDPA)
      // ======================================================

      const covidVacRaw = cleanText(String(row[COL.COVID_VACCINE] ?? ""));
      const covidVac = isBlankLike(covidVacRaw) ? null : covidVacRaw;

      const pdpaConsentRaw = cleanText(row[COL.PDPA_CONSENT]);
      const pdpaConsent = !isBlankLike(pdpaConsentRaw) ? true : null;

      if (DRY_RUN) {
        console.log(
          `   🧪 [dry-run] would update covidVac="${covidVac}" pdpaConsent=${pdpaConsent}`,
        );
      } else {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { covidVac, pdpaConsent },
        });
      }

      // ======================================================
      // Medical Check up (Chevron) 1 YEAR — col G-K
      // ======================================================

      if (medicalRequirement) {
        try {
          const medicalHospital = cleanText(row[COL.MEDICAL_HOSP]);
          const medicalIssuedDate = parseDate(row[COL.MEDICAL_ISSUE]);
          const medicalExpiryDate = parseDate(row[COL.MEDICAL_EXP]);

          if (medicalIssuedDate || medicalExpiryDate) {
            const remindDays = 30;
            const remindDate = medicalExpiryDate
              ? new Date(
                  medicalExpiryDate.getTime() -
                    remindDays * 24 * 60 * 60 * 1000,
                )
              : null;

            let medicalStatus = "pending";
            if (medicalExpiryDate) {
              medicalStatus =
                medicalExpiryDate < new Date() ? "overdue" : "passed";
            }

            if (DRY_RUN) {
              console.log(
                `   🧪 [dry-run] would upsert ${MEDICAL_CHECK_TYPE} (${medicalStatus}) hospital="${medicalHospital}"`,
              );
            } else {
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
          }
        } catch (err) {
          console.log(`❌ Medical Error: ${err.message}`);
        }
      }

      // ======================================================
      // Medical Check up ที่ 2 — col M-Q ("Hospital2" group)
      // ======================================================

      if (medicalRequirement) {
        try {
          const medical2Hospital = cleanText(row[COL.MEDICAL2_HOSP]);
          const medical2IssuedDate = parseDate(row[COL.MEDICAL2_ISSUE]);
          const medical2ExpiryDate = parseDate(row[COL.MEDICAL2_EXP]);

          if (medical2IssuedDate || medical2ExpiryDate) {
            const remindDays = 30;
            const remindDate = medical2ExpiryDate
              ? new Date(
                  medical2ExpiryDate.getTime() -
                    remindDays * 24 * 60 * 60 * 1000,
                )
              : null;

            let medical2Status = "pending";
            if (medical2ExpiryDate) {
              medical2Status =
                medical2ExpiryDate < new Date() ? "overdue" : "passed";
            }

            if (DRY_RUN) {
              console.log(
                `   🧪 [dry-run] would upsert ${MEDICAL_CHECK_TYPE_2} (${medical2Status}) hospital="${medical2Hospital}"`,
              );
            } else {
              await prisma.medicalCheck.upsert({
                where: {
                  employeeId_checkType_medicalRequirementId: {
                    employeeId: employee.id,
                    checkType: MEDICAL_CHECK_TYPE_2,
                    medicalRequirementId: medicalRequirement.id,
                  },
                },
                update: {
                  hospital: medical2Hospital,
                  issuedDate: medical2IssuedDate,
                  expiryDate: medical2ExpiryDate,
                  remindDate,
                  remindDays,
                  status: medical2Status,
                },
                create: {
                  employeeId: employee.id,
                  medicalRequirementId: medicalRequirement.id,
                  checkType: MEDICAL_CHECK_TYPE_2,
                  hospital: medical2Hospital,
                  issuedDate: medical2IssuedDate,
                  expiryDate: medical2ExpiryDate,
                  remindDate,
                  remindDays,
                  status: medical2Status,
                },
              });
              console.log(`   💉 ${MEDICAL_CHECK_TYPE_2} (${medical2Status})`);
            }
          }
        } catch (err) {
          console.log(`❌ Medical Check up 2 Error: ${err.message}`);
        }
      }

      // ======================================================
      // Passport — col X-AB
      // ======================================================

      try {
        const passportNo = cleanText(row[COL.PASSPORT_NO]);
        const passportIssue = parseDate(row[COL.PASSPORT_ISSUE]);
        const passportExp = parseDate(row[COL.PASSPORT_EXP]);

        if (passportNo || passportIssue || passportExp) {
          if (DRY_RUN) {
            console.log(
              `   🧪 [dry-run] would upsert Passport ${passportNo || "(no number)"}`,
            );
          } else {
            await prisma.passport.upsert({
              where: { employeeId: employee.id },
              update: {
                passportNo,
                issueDate: passportIssue,
                expiryDate: passportExp,
                // remindDate: — schema ยังไม่มี field นี้ (schema gap #2)
              },
              create: {
                employeeId: employee.id,
                passportNo,
                issueDate: passportIssue,
                expiryDate: passportExp,
              },
            });
            console.log(`   🛂 Passport ${passportNo || "(no number)"}`);
          }
        }
      } catch (err) {
        console.log(`❌ Passport Error: ${err.message}`);
      }

      // ======================================================
      // Trainings — col AD onward
      // ======================================================

      for (const layout of mappedLayout) {
        try {
          const globalTraining = layout.globalTraining;
          const clientTraining = layout.clientTraining;

          const completedDate = parseDate(row[layout.completedCol]);
          const expiryDate = parseDate(row[layout.expiryCol]);

          // ✅ ไม่อ่าน status/remind date จาก Excel — คำนวณจากวันที่ล้วนๆ
          const status = getTrainingStatus(expiryDate, completedDate);

          if (!status && !completedDate && !expiryDate) continue;

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

          if (DRY_RUN) {
            console.log(
              `   🧪 [dry-run] would ${existing ? `supersede v${existing.version} + create v${(existing.version || 1) + 1}` : "create v1"} for "${globalTraining.name}" (${status}) completed=${completedDate?.toISOString().slice(0, 10) || "-"} expiry=${expiryDate?.toISOString().slice(0, 10) || "-"}`,
            );
          } else if (existing) {
            await prisma.employeeTraining.update({
              where: { id: existing.id },
              data: { isLatest: false },
            });

            await prisma.employeeTraining.create({
              data: {
                employeeId: employee.id,
                rawTrainingName: layout.trainingName,
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
                rawTrainingName: layout.trainingName,
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
          if (!DRY_RUN) {
            console.log(`   ✔ ${globalTraining.name} (${status})`);
          }
        } catch (err) {
          console.error(`❌ ${layout.trainingName}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ Row ${rowIndex + 1}: ${err.message}`);
    }
  }

  console.log("\n================================");
  console.log(
    DRY_RUN
      ? "✅ Dry Run Completed (ไม่มีอะไรถูกเขียนลง DB จริง)"
      : "✅ Import Completed",
  );
  console.log(`✔ ${DRY_RUN ? "Would insert" : "Inserted"}: ${inserted}`);

  if (skippedEmployees.length > 0) {
    console.log("\n⚠ Skipped Employees (not found by empId or name):");
    for (const item of skippedEmployees) {
      console.log(
        `- [Chevron:${item.empId}] ${item.fullName} (row ${item.row})`,
      );
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
