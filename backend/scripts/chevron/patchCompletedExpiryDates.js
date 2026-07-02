import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Config — ปรับ path/sheet ให้ตรงกับไฟล์จริง
// ============================================================

const FILE_PATH = path.join(
  __dirname,
  "../../../training_record_from_hr/clean/Employee Training Offshore-Chevron 31-3-2026-CLEAN.xlsx",
);

const CLIENT_NAME = "Chevron";
const SHEET_NAME = "Record";

const COL = {
  FULL_NAME_EN: 1, // B
  FULL_NAME_TH: 2, // C
  TRAINING_START: 23, // X
};

const ROW = {
  TRAINING_NAME: 4, // row 5
  TRAINING_FIELD: 6, // row 7
  EMPLOYEE_START: 7, // row 8
  EMPLOYEE_END: 162, // row 163
};

const DRY_RUN = !process.argv.includes("--apply");
const FUZZY = process.argv.includes("--fuzzy");
const FUZZY_THRESHOLD = 0.82; // ratio ที่ถือว่า "น่าจะคนเดียวกัน"

// ============================================================
// Fuzzy match helpers (เหมือน importRoster.js)
// ============================================================

function norm(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[m];
}

function ratio(a, b) {
  const max = Math.max(a.length, b.length) || 1;
  return 1 - lev(a, b) / max;
}

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

  if (val instanceof Date) return inRange(val);

  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return inRange(new Date(excelEpoch.getTime() + val * 86400000));
  }

  if (typeof val === "string") {
    if (val.startsWith("=")) return null;

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

function isEmployeeRow(row) {
  const name = row[COL.FULL_NAME_EN];
  if (!name || typeof name !== "string") return false;
  if (name.startsWith("=")) return false;
  return name.trim().length > 3;
}

// ============================================================
// Main
// ============================================================

async function patchCompletedAndExpiryDates() {
  console.log(
    `\n🔧 MODE: ${DRY_RUN ? "DRY-RUN (ไม่เขียน)" : "APPLY (เขียน DB)"}` +
      `${FUZZY ? " + FUZZY" : ""}\n`,
  );

  const workbook = xlsx.readFile(FILE_PATH, {
    cellDates: true,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Sheet not found: ${SHEET_NAME}`);

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  const client = await prisma.client.findFirst({
    where: { name: CLIENT_NAME },
  });
  if (!client) throw new Error(`Client not found: ${CLIENT_NAME}`);

  const contract = await prisma.contract.findFirst({
    where: { clientId: client.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!contract) throw new Error(`Contract not found: ${CLIENT_NAME}`);

  // ── Build training layout (forward-fill merged header cells) ──
  const trainingLayout = [];
  const headerRow = rows[ROW.TRAINING_NAME];
  const fieldRow = rows[ROW.TRAINING_FIELD];

  let currentTrainingName = null;

  for (let col = COL.TRAINING_START; col < headerRow.length; col++) {
    const cleanedTrainingName = cleanText(headerRow[col]);

    if (cleanedTrainingName) {
      currentTrainingName = cleanedTrainingName;
    }

    if (!currentTrainingName) continue;

    const fieldName = cleanText(fieldRow[col]);
    if (!fieldName) continue;

    let existing = trainingLayout.find(
      (t) => t.trainingName === currentTrainingName,
    );

    if (!existing) {
      const clientTraining = await prisma.clientTraining.findFirst({
        where: {
          contractId: contract.id,
          OR: [
            { nameAlias: currentTrainingName },
            { globalTraining: { name: currentTrainingName } },
          ],
        },
        include: { globalTraining: true },
      });

      if (!clientTraining) {
        console.log(`⚠ No mapping: "${currentTrainingName}"`);
        continue;
      }

      existing = {
        trainingName: currentTrainingName,
        globalTraining: clientTraining.globalTraining,
        completedCol: null,
        expiryCol: null,
      };
      trainingLayout.push(existing);
    }

    const lower = fieldName.toLowerCase();
    if (lower.includes("completed")) existing.completedCol = col;
    if (lower.includes("expire")) existing.expiryCol = col;
  }

  console.log(`📚 Trainings mapped: ${trainingLayout.length}`);
  trainingLayout.forEach((t) =>
    console.log(
      `   • ${t.trainingName} — completedCol=${t.completedCol}, expiryCol=${t.expiryCol}`,
    ),
  );

  // ── โหลด employee ทั้งหมดมาไว้ล่วงหน้า สำหรับ exact + fuzzy lookup ──
  const allEmployees = await prisma.employee.findMany({
    select: { id: true, fullName: true, fullNameEN: true, fullNameTH: true },
  });

  // map ชื่อ (normalize) → employee สำหรับ exact match
  const exactByNorm = new Map();
  for (const e of allEmployees) {
    for (const nm of [e.fullNameEN, e.fullNameTH, e.fullName]) {
      const k = norm(nm);
      if (k && !exactByNorm.has(k)) exactByNorm.set(k, e);
    }
  }
  const allNormKeys = [...exactByNorm.keys()];

  // หา employee จากชื่อ — exact ก่อน, ไม่เจอค่อย fuzzy (ถ้าเปิด --fuzzy)
  function findEmployeeByName(fullNameTH, fullNameEN) {
    const candidates = [norm(fullNameTH), norm(fullNameEN)].filter(Boolean);

    for (const k of candidates) {
      if (exactByNorm.has(k)) {
        return { employee: exactByNorm.get(k), matchType: "exact" };
      }
    }

    if (!FUZZY) return { employee: null, matchType: "none" };

    // fuzzy: หาตัวที่ ratio สูงสุดจากทุกชื่อผู้สมัคร
    let best = null;
    let bestKey = null;
    let bestRatio = 0;
    for (const k of candidates) {
      for (const dbKey of allNormKeys) {
        const r = ratio(k, dbKey);
        if (r > bestRatio) {
          bestRatio = r;
          bestKey = dbKey;
        }
      }
    }
    if (bestKey && bestRatio >= FUZZY_THRESHOLD) {
      return {
        employee: exactByNorm.get(bestKey),
        matchType: "fuzzy",
        ratio: bestRatio,
        matchedName: bestKey,
      };
    }
    return { employee: null, matchType: "none" };
  }

  // ── Loop employees, patch completedDate/expiryDate ──
  let updated = 0;
  let noExistingRecord = 0;
  let employeeNotFound = 0;
  let fuzzyMatched = 0;
  const notFoundNames = new Set();
  const fuzzyMatches = [];
  const skippedNoRecord = []; // ← เพิ่ม: เก็บรายละเอียดคนที่ถูกข้ามเพราะไม่มี record เดิม

  for (
    let rowIndex = ROW.EMPLOYEE_START;
    rowIndex <= ROW.EMPLOYEE_END;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!isEmployeeRow(row)) continue;

    const fullNameTH = cleanText(row[COL.FULL_NAME_TH]);
    const fullNameEN = cleanText(row[COL.FULL_NAME_EN]);

    const {
      employee,
      matchType,
      ratio: matchRatio,
      matchedName,
    } = findEmployeeByName(fullNameTH, fullNameEN);

    if (!employee) {
      employeeNotFound++;
      notFoundNames.add(fullNameTH || fullNameEN);
      continue;
    }

    if (matchType === "fuzzy") {
      fuzzyMatched++;
      fuzzyMatches.push({
        excelName: fullNameTH || fullNameEN,
        dbName: matchedName,
        ratio: matchRatio,
      });
      console.log(
        `   🔎 fuzzy match: "${fullNameTH || fullNameEN}" → DB "${matchedName}" (${(matchRatio * 100).toFixed(0)}%)`,
      );
    }

    for (const training of trainingLayout) {
      const completedDate = training.completedCol
        ? parseDate(row[training.completedCol])
        : null;
      const expiryDate = training.expiryCol
        ? parseDate(row[training.expiryCol])
        : null;

      if (!completedDate && !expiryDate) continue; // ไม่มีข้อมูลอะไรเลย ข้าม

      // หา record ที่มีอยู่แล้ว (isLatest) — ไม่สร้างใหม่ ไม่แตะ field อื่น
      const existingTraining = await prisma.employeeTraining.findFirst({
        where: {
          employeeId: employee.id,
          globalTrainingId: training.globalTraining.id,
          contractId: contract.id,
          isLatest: true,
        },
      });

      if (!existingTraining) {
        noExistingRecord++;
        skippedNoRecord.push({
          name: fullNameTH || fullNameEN,
          training: training.trainingName,
          completed: completedDate?.toISOString().slice(0, 10) || "—",
          expiry: expiryDate?.toISOString().slice(0, 10) || "—",
        });
        continue;
      }

      console.log(
        `${DRY_RUN ? "🔍" : "✔"} ${fullNameTH || fullNameEN} — ${training.trainingName}: ` +
          `completed=${completedDate?.toISOString().slice(0, 10) || "—"}, ` +
          `expiry=${expiryDate?.toISOString().slice(0, 10) || "—"}`,
      );

      if (!DRY_RUN) {
        await prisma.employeeTraining.update({
          where: { id: existingTraining.id },
          data: {
            ...(completedDate ? { completedDate } : {}),
            ...(expiryDate ? { expiryDate } : {}),
          },
        });
      }

      updated++;
    }
  }

  console.log("\n========== SUMMARY ==========");
  console.log("✔ Updated (completed/expiry):", updated);
  console.log("⚠ No existing training record (skipped):", noExistingRecord);
  console.log("⚠ Employee not found:", employeeNotFound);
  if (FUZZY) console.log("🔎 Fuzzy matched:", fuzzyMatched);

  if (skippedNoRecord.length > 0) {
    console.log("\n   ===== SKIPPED (ไม่มี training record เดิม) =====");
    for (const s of skippedNoRecord) {
      console.log(
        `   "${s.name}" — ${s.training}: completed=${s.completed}, expiry=${s.expiry}`,
      );
    }
  }

  if (fuzzyMatches.length > 0) {
    console.log("\n   ===== FUZZY MATCHES (ยืนยันก่อนเชื่อ) =====");
    for (const m of fuzzyMatches) {
      console.log(
        `   "${m.excelName}"  →  DB "${m.dbName}"  (${(m.ratio * 100).toFixed(0)}%)`,
      );
    }
  }

  if (notFoundNames.size > 0) {
    console.log("\n   Not found names (ลอง --fuzzy ถ้ายังไม่ได้เปิด):");
    [...notFoundNames].forEach((n) => console.log("   •", n));
  }

  if (DRY_RUN) {
    console.log(
      "\n💡 DRY-RUN — ยังไม่เขียน DB. รันใหม่ด้วย --apply เพื่อบันทึกจริง\n",
    );
  } else {
    console.log("\n✅ Done\n");
  }
}

patchCompletedAndExpiryDates()
  .catch((err) => {
    console.error("💥 Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
