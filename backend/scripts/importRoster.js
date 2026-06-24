// ════════════════════════════════════════════════════════════════
// importRoster.js — Phase 1
// อ่าน Employee age 13-6-26.xlsx → เซ็ตข้อมูล roster ลง model Employee
//   (isPermanent / healthRisk / healthNote / notes / sseLevel /
//    sseCompleted / birthDate / position)
//
// MOB / D-MOB / platform (→ Assignment) = Phase 2 (ต้อง migrate ก่อน) — รอบนี้แค่ report
//
// การ match ชื่อ (col C = fullNameEN):
//   exact (normalize)  → update
//   near-match (fuzzy) → ไม่ทำอัตโนมัติ, report คู่ที่เดา (กันคนซ้ำจากสะกดต่าง)
//   ไม่ใกล้ใคร         → create ใหม่
//
// โหมด:
//   node scripts/chevron/importRoster.js            → DRY-RUN (ไม่เขียน DB) ดูผลก่อน
//   node scripts/chevron/importRoster.js --apply    → เขียนจริง (update exact + create ใหม่)
//   node scripts/chevron/importRoster.js --apply --fuzzy
//                                                   → +อัปเดต near-match ให้ DB ตัวที่ใกล้สุดด้วย
// ════════════════════════════════════════════════════════════════

import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.join(
  __dirname,
  "../../../training_record_from_hr/Employee age 13-6-26.xlsx",
);

const APPLY = process.argv.includes("--apply");
const FUZZY = process.argv.includes("--fuzzy");

const ROW_START = 4;
const ROW_END = 195;
const FUZZY_THRESHOLD = 0.82; // ratio ที่ถือว่า "น่าจะคนเดียวกัน"
const DEMOB_DAYS = 28; // D-MOB = MOB + 28 วัน (4 สัปดาห์)

// ── helpers ──
const norm = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

// เก็บชื่อสำหรับเขียนลง DB: trim + ยุบช่องว่างซ้ำ (คงตัวพิมพ์เดิม)
const cleanName = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ");

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

function parseDate(cell) {
  if (!cell || cell.v === undefined || cell.v === null) return null;
  const v = cell.v;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  if (typeof v === "number") {
    const o = xlsx.SSF && xlsx.SSF.parse_date_code(v);
    if (!o) return null;
    if (o.y < 1900 || o.y > 2100) return null;
    return new Date(Date.UTC(o.y, o.m - 1, o.d));
  }
  if (typeof v === "string") {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
    if (!m) return null;
    const d = +m[1];
    const mo = +m[2];
    const y = +m[3];
    if (y < 1900 || y > 2100) return null;
    return new Date(Date.UTC(y, mo - 1, d));
  }
  return null;
}

function parseHealth(cell) {
  const s = String(cell?.v ?? "");
  if (s.includes("สูง")) return "high";
  if (s.includes("กลาง")) return "medium";
  if (s.includes("ต่ำ")) return "low";
  return null;
}

// คืน { notes, healthNote } — เซ็ตเฉพาะตัวที่มีค่า
function parseNote(cell) {
  const s = String(cell?.v ?? "").trim();
  if (!s) return { notes: null, healthNote: null };
  if (s.includes("เกษียณ")) return { notes: null, healthNote: null }; // ข้าม
  if (s.includes("โดนโทษ")) return { notes: s, healthNote: null };
  return { notes: null, healthNote: s };
}

function parseSSE(cell) {
  const s = String(cell?.v ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!s) return null;
  if (s.includes("newsse")) return "new_sse";
  if (s.includes("sse1")) return "sse1";
  if (s.includes("sse2")) return "sse2";
  return null;
}

function parseSSEPass(cell, sseLevel) {
  const s = String(cell?.v ?? "")
    .trim()
    .toLowerCase();
  if (s === "completed") return true;
  if (sseLevel || s) return false; // มี SSE context แต่ยังไม่ completed
  return null;
}

function parseBool(cell) {
  if (!cell || cell.v === undefined || cell.v === null) return false;
  if (typeof cell.v === "boolean") return cell.v;
  const s = String(cell.v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function cellStr(cell) {
  return String(cell?.v ?? "").trim();
}

// normalize slash ให้ตรง seedPositions (" / ")
function normPosition(name) {
  return name.replace(/\s*\/\s*/g, " / ");
}

async function main() {
  console.log(
    `\n🔧 MODE: ${APPLY ? "APPLY (เขียน DB)" : "DRY-RUN (ไม่เขียน)"}` +
      `${FUZZY ? " + FUZZY" : ""}\n`,
  );

  const wb = xlsx.readFile(FILE_PATH, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // ── โหลด lookup จาก DB ──
  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, fullNameEN: true, empCode: true },
  });
  // map norm(ชื่อ) → employee (จาก fullNameEN และ fullName)
  const dbByNorm = new Map();
  for (const e of employees) {
    for (const nm of [e.fullNameEN, e.fullName]) {
      const k = norm(nm);
      if (k && !dbByNorm.has(k)) dbByNorm.set(k, e);
    }
  }
  const dbKeys = [...dbByNorm.keys()];

  const positions = await prisma.position.findMany({
    select: { id: true, name: true },
  });
  const posByNorm = new Map();
  for (const p of positions) posByNorm.set(norm(p.name), p);

  // empCode generator
  let maxCode = 0;
  for (const e of employees) {
    const m = /^EXPT-(\d+)$/.exec(e.empCode || "");
    if (m) maxCode = Math.max(maxCode, +m[1]);
  }
  const nextCode = () => `EXPT-${String(++maxCode).padStart(3, "0")}`;

  // ── อ่านแถว ──
  const toUpdate = []; // exact match
  const nearMatch = []; // fuzzy (review)
  const toCreate = []; // ใหม่จริง
  const posNotFound = new Set();
  const deploymentRows = []; // Phase 2 (Assignment)
  const usedDbIds = new Set();

  for (let r = ROW_START; r <= ROW_END; r++) {
    const name = cellStr(sheet[`C${r}`]);
    if (!name) continue;

    const positionName = cellStr(sheet[`D${r}`]);
    const birthDate = parseDate(sheet[`E${r}`]);
    const healthRisk = parseHealth(sheet[`G${r}`]);
    const note = parseNote(sheet[`H${r}`]);
    const sseLevel = parseSSE(sheet[`I${r}`]);
    const sseCompleted = parseSSEPass(sheet[`J${r}`], sseLevel);
    const mobDate = parseDate(sheet[`L${r}`]);
    const demobDate = mobDate
      ? new Date(mobDate.getTime() + DEMOB_DAYS * 86400000)
      : null;
    const platform = cellStr(sheet[`P${r}`]) || null;
    const isPermanent = parseBool(sheet[`Q${r}`]);

    // หา position
    let positionId = null;
    if (positionName) {
      const p =
        posByNorm.get(norm(positionName)) ||
        posByNorm.get(norm(normPosition(positionName)));
      if (p) positionId = p.id;
      else posNotFound.add(positionName);
    }

    // เก็บ field ที่จะเซ็ต (เฉพาะตัวที่มีค่า — กันทับของเดิมด้วย null)
    const fields = { isPermanent, isOffshore: true };
    if (birthDate) fields.birthDate = birthDate;
    if (healthRisk) fields.healthRisk = healthRisk;
    if (note.notes) fields.notes = note.notes;
    if (note.healthNote) fields.healthNote = note.healthNote;
    if (sseLevel) fields.sseLevel = sseLevel;
    if (sseCompleted !== null) fields.sseCompleted = sseCompleted;
    if (positionId) fields.positionId = positionId;

    if (mobDate || platform)
      deploymentRows.push({ name, mobDate, demobDate, platform });

    const key = norm(name);
    const exact = dbByNorm.get(key);
    if (exact) {
      toUpdate.push({ name, emp: exact, fields });
      continue;
    }
    // fuzzy
    let best = null;
    let bestR = 0;
    for (const k of dbKeys) {
      const rr = ratio(key, k);
      if (rr > bestR) {
        bestR = rr;
        best = k;
      }
    }
    if (best && bestR >= FUZZY_THRESHOLD) {
      nearMatch.push({
        name,
        dbName: dbByNorm.get(best).fullNameEN || dbByNorm.get(best).fullName,
        emp: dbByNorm.get(best),
        ratio: bestR,
        fields,
      });
    } else {
      toCreate.push({ name, positionName, fields });
    }
  }

  // ── REPORT ──
  console.log("========== SUMMARY ==========");
  console.log("Exact match (update) :", toUpdate.length);
  console.log("Near-match (review)  :", nearMatch.length);
  console.log("New (create)         :", toCreate.length);
  console.log("Deployment rows (P2) :", deploymentRows.length);
  console.log("Position not found   :", posNotFound.size);

  if (nearMatch.length) {
    console.log(
      "\n===== NEAR-MATCH (สะกดใกล้ — ยืนยันก่อน, ใช้ --fuzzy ถึงจะอัปเดต) =====",
    );
    for (const n of nearMatch)
      console.log(
        `  "${n.name}"  →  DB "${n.dbName}"  (${(n.ratio * 100).toFixed(0)}%)`,
      );
  }
  if (toCreate.length) {
    console.log("\n===== NEW (จะสร้างใหม่ตอน --apply) =====");
    for (const c of toCreate) console.log(`  ${c.name}  [${c.positionName}]`);
  }
  if (posNotFound.size) {
    console.log("\n===== POSITION NOT FOUND (positionId = null) =====");
    for (const p of posNotFound) console.log(`  ${p}`);
  }

  if (!APPLY) {
    console.log(
      "\n💡 DRY-RUN — ยังไม่เขียน DB. ถ้าผลโอเค รันใหม่ด้วย --apply (และ --fuzzy ถ้าต้องการอัปเดต near-match)\n",
    );
    await prisma.$disconnect();
    return;
  }

  // ── APPLY ──
  let updated = 0;
  let created = 0;
  let fuzzyUpdated = 0;

  for (const u of toUpdate) {
    await prisma.employee.update({ where: { id: u.emp.id }, data: u.fields });
    usedDbIds.add(u.emp.id);
    updated++;
  }

  if (FUZZY) {
    for (const n of nearMatch) {
      if (usedDbIds.has(n.emp.id)) continue; // กันชน 2 แถวลง DB ตัวเดียว
      await prisma.employee.update({
        where: { id: n.emp.id },
        data: {
          ...n.fields,
          fullName: cleanName(n.name), // ทับชื่อ DB ด้วยชื่อจาก Excel
          fullNameEN: cleanName(n.name),
        },
      });
      usedDbIds.add(n.emp.id);
      fuzzyUpdated++;
    }
  }

  for (const c of toCreate) {
    await prisma.employee.create({
      data: {
        empCode: nextCode(),
        fullName: cleanName(c.name),
        fullNameEN: cleanName(c.name),
        status: "active",
        availabilityStatus: "available",
        mobilizationStatus: "pending",
        ...c.fields,
      },
    });
    created++;
  }

  console.log("\n========== DONE ==========");
  console.log("Updated (exact) :", updated);
  if (FUZZY)
    console.log("Updated (fuzzy) :", fuzzyUpdated, "(ทับชื่อจาก Excel)");
  console.log("Created (new)   :", created);
  if (!FUZZY && nearMatch.length)
    console.log(
      `⚠ near-match ${nearMatch.length} รายการ ยังไม่อัปเดต (ไม่ได้ใส่ --fuzzy)`,
    );
  console.log(
    `\nℹ MOB/D-MOB/platform (${deploymentRows.length} แถว) ยังไม่เขียน — รอ Phase 2 (Assignment) หลัง migrate\n`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
