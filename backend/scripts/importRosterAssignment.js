// ════════════════════════════════════════════════════════════════
// importRosterAssignment.js — Phase 2
// อ่าน Employee age 13-6-26.xlsx → เขียน Assignment (deployment snapshot)
//   L  MOB      → mobDate
//   M  D-MOB    → demobDate = mobDate + 28 วัน (คำนวณ, ไม่อ่าน cell)
//   P  Location → platform
//   status คำนวณจากวันที่: mob อนาคต=planned, ยังไม่ถึง demob=active, เลย demob=completed
//
// ต้อง migrate relax_assignment_for_roster ก่อน (bookingId?/projectId? nullable)
// ชื่อ match กับ Employee.fullNameEN (Phase 1 ทับชื่อให้ตรง Excel แล้ว → exact ครบ)
//
// idempotent: ลบ Assignment เดิมของพนักงานที่ bookingId=null (roster) ทิ้งก่อนสร้างใหม่
//             → ไม่แตะ Assignment จริงที่มาจาก booking flow (bookingId != null)
//
//   node scripts/importRosterAssignment.js            → DRY-RUN
//   node scripts/importRosterAssignment.js --apply     → เขียนจริง
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
const ROW_START = 4;
const ROW_END = 195;
const DEMOB_DAYS = 28;

const norm = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
const cellStr = (c) => String(c?.v ?? "").trim();

function parseDate(cell) {
  if (!cell || cell.v === undefined || cell.v === null) return null;
  const v = cell.v;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  if (typeof v === "number") {
    const o = xlsx.SSF && xlsx.SSF.parse_date_code(v);
    if (!o || o.y < 1900 || o.y > 2100) return null;
    return new Date(Date.UTC(o.y, o.m - 1, o.d));
  }
  if (typeof v === "string") {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
    if (!m) return null;
    const y = +m[3];
    if (y < 1900 || y > 2100) return null;
    return new Date(Date.UTC(y, +m[2] - 1, +m[1]));
  }
  return null;
}

function computeStatus(mob, demob, today) {
  if (mob && mob.getTime() > today) return "planned";
  if (demob && demob.getTime() >= today) return "active";
  return "completed";
}

async function main() {
  console.log(
    `\n🔧 MODE: ${APPLY ? "APPLY (เขียน DB)" : "DRY-RUN (ไม่เขียน)"}\n`,
  );

  const wb = xlsx.readFile(FILE_PATH, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, fullNameEN: true },
  });
  const byNorm = new Map();
  for (const e of employees) {
    for (const nm of [e.fullNameEN, e.fullName]) {
      const k = norm(nm);
      if (k && !byNorm.has(k)) byNorm.set(k, e);
    }
  }

  const today = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );

  const plan = []; // { emp, mobDate, demobDate, platform, status }
  const notMatched = [];
  const noDeploy = [];
  const statusCount = { planned: 0, active: 0, completed: 0 };

  for (let r = ROW_START; r <= ROW_END; r++) {
    const name = cellStr(sheet[`C${r}`]);
    if (!name) continue;

    const mobDate = parseDate(sheet[`L${r}`]);
    const platform = cellStr(sheet[`P${r}`]) || null;

    if (!mobDate && !platform) {
      noDeploy.push(name);
      continue;
    }

    const emp = byNorm.get(norm(name));
    if (!emp) {
      notMatched.push(name);
      continue;
    }

    const demobDate = mobDate
      ? new Date(mobDate.getTime() + DEMOB_DAYS * 86400000)
      : null;
    const status = computeStatus(mobDate, demobDate, today);
    statusCount[status]++;

    plan.push({ emp, mobDate, demobDate, platform, status });
  }

  console.log("========== SUMMARY ==========");
  console.log("จะเขียน Assignment :", plan.length);
  console.log(
    "  planned/active/completed :",
    statusCount.planned,
    "/",
    statusCount.active,
    "/",
    statusCount.completed,
  );
  console.log("ไม่มี MOB/platform :", noDeploy.length);
  console.log("match ชื่อไม่เจอ   :", notMatched.length);
  if (notMatched.length) {
    console.log("\n===== NOT MATCHED (ข้าม — รัน Phase 1 ครบหรือยัง?) =====");
    notMatched.forEach((n) => console.log("  " + n));
  }

  // ตัวอย่าง 5 รายการแรก
  console.log("\n===== ตัวอย่าง (5 แถวแรก) =====");
  for (const p of plan.slice(0, 5)) {
    const f = (d) => (d ? d.toISOString().slice(0, 10) : "—");
    console.log(
      `  ${p.emp.fullNameEN || p.emp.fullName}  MOB ${f(p.mobDate)}  D-MOB ${f(p.demobDate)}  @${p.platform || "—"}  [${p.status}]`,
    );
  }

  if (!APPLY) {
    console.log("\n💡 DRY-RUN — ถ้าผลโอเค รันใหม่ด้วย --apply\n");
    await prisma.$disconnect();
    return;
  }

  let written = 0;
  for (const p of plan) {
    // ลบ roster assignment เดิมของคนนี้ (bookingId=null) — ไม่แตะของจริง
    await prisma.assignment.deleteMany({
      where: { employeeId: p.emp.id, bookingId: null },
    });
    await prisma.assignment.create({
      data: {
        employeeId: p.emp.id,
        bookingId: null,
        projectId: null,
        status: p.status,
        mobDate: p.mobDate,
        demobDate: p.demobDate,
        platform: p.platform,
      },
    });
    written++;
  }

  console.log("\n========== DONE ==========");
  console.log("เขียน Assignment :", written);
  console.log(
    "→ Allocation: DAY OFF จะคำนวณจาก demobDate แล้ว (Ctrl+Shift+R)\n",
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("💥", e);
  await prisma.$disconnect();
  process.exit(1);
});
