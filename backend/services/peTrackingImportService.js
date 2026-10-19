// ============================================================
// services/peTrackingImportService.js
// นำเข้าผลตรวจสุขภาพประจำปีจากไฟล์ "PE tracking_2025 version dd-mm-yyyy.xlsx"
// (sheet แรกที่มีหัว "วันที่ตรวจร่างกาย" — ปกติชื่อ sheet เป็นวันที่ เช่น "30-4-2026")
//
// หาคอลัมน์จาก "คำในหัวคอลัมน์" ไม่ fix ตำแหน่ง → HR แทรก/ย้าย/ซ่อนคอลัมน์ก็ยังอ่านได้
// หัวคอลัมน์มีหลายภาษา (TH / EN / 中文) ได้ — ใช้คำไทยหรืออังกฤษคำใดคำหนึ่งจับ
//
// กติกา:
//   - จับคู่พนักงานด้วยชื่อไทย (col A) → ไม่เจอใช้ชื่อ+นามสกุลอังกฤษ (col B+C)
//     (ไฟล์นี้ไม่มี Employee ID)
//   - PE record วันตรวจเดียวกันมีอยู่แล้ว → อัปเดตเฉพาะช่องที่ไฟล์มีค่าและต่างจากเดิม
//     ช่องว่าง / "-" / N/A ในไฟล์ → ไม่ลบของเดิม
//   - วันตรวจใหม่ → สร้าง record ใหม่ แล้วคำนวณ isLatest ใหม่ (วันตรวจล่าสุด = latest)
//     + sync Employee.healthRisk จาก record ล่าสุด (เหมือน workerService)
//   - Medical Check-up: วันตรวจใหม่กว่า issuedDate เดิม → issuedDate = วันตรวจ,
//     expiryDate = +1 ปี (ตรงกับหน้า EditWorker)
//   - แถว "New SSE" (col A) แบ่งไฟล์เป็น 2 ส่วน:
//       ก่อนแถวนี้ → ติ๊ก Permanent Worker (ติ๊กให้อย่างเดียว ไม่เอาออก)
//       หลังแถวนี้ → SSE Level = NEW SSE (เฉพาะคนที่ยังไม่ได้ตั้ง — ไม่ลดระดับ SSE1/SSE2)
//   - วันเกิด / สถานที่ทำงาน / แผนก → เติมเฉพาะเมื่อในระบบยังว่าง
//   - AL, AM, AS, AT เป็นค่าคำนวณ → ไม่เก็บ
// ============================================================
import xlsx from "xlsx";
import prisma from "../config/prisma.js";

const DEFAULT_CLIENT = "Chevron";
const MEDICAL_CHECK_TYPE = "Medical Check up";
const MAX_CHANGE_ROWS = 500;

// ── text helpers ──
const cleanText = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
  return s || null;
};
const BLANK_RE = /^(-+|n\/?a|#value!|#n\/a|#ref!|#div\/0!)$/i;
const valueText = (v) => {
  const s = cleanText(v);
  return !s || BLANK_RE.test(s) ? null : s;
};
// key หลวม — ไม่สนช่องว่าง/ตัวพิมพ์/เครื่องหมาย ใช้จับคู่ชื่อ
const looseKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s\-_/().,:;'"&]+/g, "");
const headerKey = (v) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// ── numbers ──
const parseNumber = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = valueText(v);
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/^-?\d+(\.\d+)?$/);
  return m ? Number(m[0]) : null;
};

// ── dates (เที่ยงคืน UTC เสมอ) ──
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const inRange = (d) => {
  if (!d || isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  return y < 1900 || y > 2100 ? null : d;
};
function parseDate(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return inRange(new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())));
  if (typeof v === "number") return inRange(new Date(EXCEL_EPOCH + Math.round(v) * 86400000));
  const s = valueText(v);
  if (!s || s.startsWith("=")) return null;
  if (/^\d{4,6}(\.\d+)?$/.test(s)) return inRange(new Date(EXCEL_EPOCH + Math.round(Number(s)) * 86400000));
  let m = s.match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/); // d/m/yyyy
  if (m) return inRange(new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])));
  m = s.match(/^(\d{1,2})[\-\s/]([a-z]{3})[a-z]*[\-\s/](\d{4})$/i); // 27-May-2026
  if (m && MONTHS[m[2].toLowerCase()] !== undefined)
    return inRange(new Date(Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1])));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); // yyyy-mm-dd
  if (m) return inRange(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
  return null;
}
const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
// วันเดียวกัน — เผื่อข้อมูลเก่าที่เก็บเป็นเที่ยงคืนเวลาไทย (17:00Z ของวันก่อน)
const DAY_TOLERANCE_MS = 30 * 3600 * 1000;
const sameDay = (a, b) =>
  !!a && !!b && Math.abs(new Date(a).getTime() - new Date(b).getTime()) < DAY_TOLERANCE_MS;
const isNewerDay = (a, b) => !b || new Date(a).getTime() - new Date(b).getTime() >= DAY_TOLERANCE_MS;
const plusOneYear = (d) =>
  new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()));

// "Moderate health risk" → "moderate" (ตรงกับตัวเลือกในหน้า EditWorker)
// ค่าอื่น (เช่น "Temporary unfit ...") เก็บตามที่ HR เขียน
const HEALTH_RISK_KEYS = ["low", "moderate", "high", "significant", "pending"];
export function normalizeHealthRisk(v) {
  const s = valueText(v);
  if (!s) return null;
  const first = s.toLowerCase().split(/\s+/)[0];
  return HEALTH_RISK_KEYS.includes(first) && /risk|^(low|moderate|high|significant|pending)$/i.test(s)
    ? first
    : s;
}

// ============================================================
// คอลัมน์: [key, ชนิด, ฟังก์ชันจับหัวคอลัมน์]  — เรียงจากเฉพาะเจาะจงไปทั่วไป
// ชนิด: "text" | "num" | "int" | "date" | "skip" (ค่าคำนวณ ไม่เก็บ) | "emp:*" (ข้อมูลพนักงาน)
// ============================================================
const has = (...words) => (h) => words.some((w) => h.includes(w));
const COLUMN_RULES = [
  // ── รายละเอียดความผิดปกติ (ต้องจับก่อนคอลัมน์ผล) ──
  ["urineAbnormalNote", "text", (h) => h.includes("รายละเอียด") && h.includes("ปัสสาวะ")],
  ["ekgAbnormalNote", "text", (h) => h.includes("รายละเอียด") && h.includes("หัวใจ")],
  ["chestXrayAbnormalNote", "text", (h) => h.includes("รายละเอียด") && /เอ็กซ|เอกซ|x-?ray/.test(h)],
  ["dentalAbnormalNote", "text", (h) => h.includes("รายละเอียด") && h.includes("ฟัน")],
  ["estAbnormalNote", "text", (h) => h.includes("รายละเอียด") && /\best\b/.test(h)],

  // ── ข้อมูลพนักงาน ──
  ["nameTH", "emp", (h) => /ชื่อ\s*-\s*นามสกุล|ชื่อและนามสกุล/.test(h)],
  ["firstEN", "emp", has("first name")],
  ["lastEN", "emp", has("surname", "นามสกุลเต็ม", "last name")],
  ["company", "emp", (h) => h.startsWith("บริษัท") || h.startsWith("company")],
  ["workplace", "emp", has("สถานที่ทำงาน", "workplace")],
  ["position", "emp", (h) => h.startsWith("ตำแหน่ง") || h.startsWith("position")],
  ["division", "emp", (h) => h.startsWith("แผนก") || h.startsWith("department")],
  ["birthDate", "emp", has("เกิด", "date of birth")],
  ["age", "skip", (h) => h.startsWith("อายุ") || h.startsWith("age")],

  // ── ผลตรวจ ──
  ["chronicDisease", "text", has("โรคประจำตัว", "underlying")],
  ["examDate", "date", has("วันที่ตรวจร่างกาย", "date of physical")],
  ["height", "num", has("ส่วนสูง", "height")],
  ["weight", "num", has("น้ำหนัก", "weight")],
  ["bmi", "num", has("ดัชนีมวลกาย", "body mass")],
  ["bpSystolic", "int", has("ตัวบน", "systolic")],
  ["bpDiastolic", "int", has("ตัวล่าง", "diastolic")],
  ["hematocritPct", "num", has("ความเข้มข้น", "hematocrit")],
  ["urineResult", "text", has("ตรวจปัสสาวะ", "urine")],
  ["bloodSugar", "num", has("น้ำตาล", "blood sugar")],
  ["ldl", "num", has("ไขมันไม่ดี", "ldl")],
  ["triglyceride", "num", has("ไตรกลี", "triglyceride")],
  ["sgot", "num", has("sgot")],
  ["sgpt", "num", has("sgpt")],
  ["uricAcid", "num", has("ยูริค", "ยูริก", "uric")],
  ["ekgResult", "text", has("คลื่นไฟฟ้าหัวใจ", "electrocardiogram")],
  ["chestXrayResult", "text", has("เอ็กซ์เรย์ปอด", "เอ็กซเรย์ปอด", "chest x")],
  ["dentalResult", "text", has("ผลตรวจฟัน", "dental")],
  ["estResult", "text", (h) => /\best\b/.test(h)],
  ["note", "text", (h) => h.startsWith("หมายเหตุ") || /^note\b/.test(h)],
  ["healthRisk", "risk", has("health risk")],
  ["recommendation", "text", has("recommendation")],
  ["commentDate", "date", has("วันที่ลง comment", "ลง comment")],

  // ── การติดตาม ──
  ["followUpRemindBefore", "text", has("แจ้งซ้ำก่อนกำหนด")],
  ["followUpRemindOverdue", "text", has("แจ้งซ้ำเมื่อเลยกำหนด")],
  ["followUpNotice", "text", has("แจ้งเมื่อมีให้ติดตาม")],
  ["followUpTopic", "text", has("เรื่องที่ต้องติดตาม")],
  ["followUpDue", "skip", has("วันที่ต้องติดตาม")], // AL — คำนวณ
  ["followUpDays", "skip", has("ระยะเวลาที่ต้องอัพเดท", "ระยะเวลาที่ต้องอัปเดต")], // AM — คำนวณ
  ["followUpSchedule", "text", has("กำหนดการติดตาม")],
  ["expiryStatus", "skip", has("สถานะวันหมดอายุ")], // AS — สูตร
  ["expiryDays", "skip", has("ระยะเวลาที่จะหมดอายุ")], // AT — สูตร
  ["nextExamDate", "date", has("ตรวจครั้งถัดไป")],
];
export const EXAM_FIELD_TYPES = Object.fromEntries(
  COLUMN_RULES.filter(([, t]) => ["text", "num", "int", "date", "risk"].includes(t)).map(([k, t]) => [k, t]),
);
const REQUIRED_KEYS = ["nameTH", "examDate"];

// ชื่อสั้นสำหรับรายงาน Preview
const FIELD_LABEL = {
  chronicDisease: "โรคประจำตัว", examDate: "วันตรวจ", height: "ส่วนสูง", weight: "น้ำหนัก", bmi: "BMI",
  bpSystolic: "ความดันบน", bpDiastolic: "ความดันล่าง", hematocritPct: "Hct", urineResult: "ปัสสาวะ",
  urineAbnormalNote: "ปัสสาวะ (รายละเอียด)", bloodSugar: "น้ำตาล", ldl: "LDL", triglyceride: "ไตรกลีเซอไรด์",
  sgot: "SGOT", sgpt: "SGPT", uricAcid: "ยูริค", ekgResult: "EKG", ekgAbnormalNote: "EKG (รายละเอียด)",
  chestXrayResult: "X-ray", chestXrayAbnormalNote: "X-ray (รายละเอียด)", dentalResult: "ฟัน",
  dentalAbnormalNote: "ฟัน (รายละเอียด)", estResult: "EST", estAbnormalNote: "EST (รายละเอียด)",
  note: "หมายเหตุ", healthRisk: "Health Risk", recommendation: "Recommendation", commentDate: "วันที่ลง Comment",
  followUpTopic: "เรื่องที่ต้องติดตาม", followUpNotice: "แจ้งเมื่อมีให้ติดตาม", followUpRemindBefore: "แจ้งซ้ำก่อนกำหนด",
  followUpRemindOverdue: "แจ้งซ้ำเมื่อเลยกำหนด", followUpSchedule: "กำหนดการติดตาม", nextExamDate: "ตรวจครั้งถัดไป",
};
const short = (v) => (v.length > 40 ? `${v.slice(0, 40)}…` : v);

// ============================================================
// 1) อ่านไฟล์
// ============================================================
export function parsePeWorkbook(buffer) {
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: false });

  let sheetName = null;
  let rows = null;
  let headerIdx = -1;
  for (const n of wb.SheetNames) {
    const r = xlsx.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null, blankrows: true });
    const h = r.slice(0, 15).findIndex((row) => (row || []).some((c) => /วันที่ตรวจร่างกาย|date of physical/i.test(String(c ?? ""))));
    if (h >= 0) {
      sheetName = n;
      rows = r;
      headerIdx = h;
      break;
    }
  }
  if (!rows) throw new Error('ไม่พบหัวคอลัมน์ "วันที่ตรวจร่างกาย" — ไฟล์ไม่ตรงรูปแบบ PE tracking');

  const header = rows[headerIdx] || [];
  const col = {};
  const used = new Set();
  for (const [key, , match] of COLUMN_RULES) {
    for (let c = 0; c < header.length; c++) {
      if (used.has(c)) continue;
      const h = headerKey(header[c]);
      if (h && match(h)) {
        col[key] = c;
        used.add(c);
        break;
      }
    }
  }
  const missing = REQUIRED_KEYS.filter((k) => col[k] === undefined);
  if (missing.length) {
    throw new Error(`ไม่พบคอลัมน์ที่จำเป็น: ${missing.join(", ")} (ชื่อ-นามสกุล / วันที่ตรวจร่างกาย)`);
  }
  const unknownHeaders = header
    .map((h, c) => (!used.has(c) && cleanText(h) ? cleanText(h) : null))
    .filter(Boolean);

  const get = (row, key) => (col[key] === undefined ? null : row[col[key]]);

  const records = [];
  let section = "permanent"; // ก่อนแถว "New SSE"
  let newSseRow = null;
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const nameTH = cleanText(get(row, "nameTH"));
    const firstEN = cleanText(get(row, "firstEN"));
    const lastEN = cleanText(get(row, "lastEN"));

    // แถวแบ่งส่วน "New SSE" — มีแต่ข้อความใน col A
    if (nameTH && /^new\s*sse$/i.test(nameTH) && !firstEN) {
      section = "new_sse";
      newSseRow = r + 1;
      continue;
    }
    if (!nameTH && !firstEN) continue; // แถวว่าง / แถวที่มีแต่ตัวเลขหลงมา

    const exam = {};
    for (const [key, type] of Object.entries(EXAM_FIELD_TYPES)) {
      const raw = get(row, key);
      if (type === "num") exam[key] = parseNumber(raw);
      else if (type === "int") {
        const n = parseNumber(raw);
        exam[key] = n === null ? null : Math.round(n);
      } else if (type === "date") exam[key] = parseDate(raw);
      else if (type === "risk") exam[key] = normalizeHealthRisk(raw);
      else exam[key] = valueText(raw);
    }

    records.push({
      rowNo: r + 1,
      section,
      nameTH,
      nameEN: [firstEN, lastEN].filter(Boolean).join(" ") || null,
      emp: {
        workplace: valueText(get(row, "workplace")),
        division: valueText(get(row, "division")),
        birthDate: parseDate(get(row, "birthDate")),
        position: valueText(get(row, "position")),
      },
      exam,
    });
  }

  return {
    sheetName,
    headerRow: headerIdx + 1,
    newSseRow,
    columnsFound: Object.keys(col).length,
    unknownHeaders,
    missingOptional: Object.keys(EXAM_FIELD_TYPES).filter((k) => col[k] === undefined),
    records,
  };
}

// ============================================================
// 2) เทียบกับ DB + เขียน
// ============================================================
const sameValue = (type, a, b) => {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (type === "date") return sameDay(a, b);
  if (type === "num" || type === "int") return Math.abs(Number(a) - Number(b)) < 1e-6;
  return String(a).trim() === String(b).trim();
};
const fmtVal = (type, v) => (v === null || v === undefined ? "-" : type === "date" ? ymd(v) : String(v));

export async function runPeTrackingImport({
  buffer,
  fileName = "upload.xlsx",
  dryRun = true,
  createMissing = false, // true = คนที่ไม่พบในระบบ → สร้างพนักงานใหม่
}) {
  const parsed = parsePeWorkbook(buffer);

  const client = await prisma.client.findFirst({ where: { name: DEFAULT_CLIENT } });
  const medicalRequirement = client
    ? await prisma.medicalRequirement.findFirst({
        where: { clientId: client.id, name: { contains: "Medical Check" } },
      })
    : null;

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      empId: true,
      fullName: true,
      fullNameTH: true,
      fullNameEN: true,
      workplace: true,
      division: true,
      birthDate: true,
      isPermanent: true,
      sseLevel: true,
    },
  });
  const byName = new Map();
  for (const e of employees) {
    for (const n of [e.fullNameTH, e.fullNameEN, e.fullName]) {
      const k = looseKey(n);
      if (k && !byName.has(k)) byName.set(k, e);
    }
  }

  // ── สำหรับสร้างพนักงานใหม่: ตำแหน่ง + รหัส EXPT ถัดไป (แบบเดียวกับหน้า Add Worker) ──
  const positions = await prisma.position.findMany({ select: { id: true, name: true, nameTH: true } });
  const posByKey = new Map();
  for (const p of positions) {
    for (const n of [p.name, p.nameTH]) {
      const k = looseKey(n);
      if (k && !posByKey.has(k)) posByKey.set(k, p);
    }
  }
  let nextExpt = 0;
  for (const e of employees) {
    const m = /^EXPT-(\d+)$/.exec(e.empCode || "");
    if (m) nextExpt = Math.max(nextExpt, Number(m[1]));
  }
  const newEmpCode = () => `EXPT-${String(++nextExpt).padStart(3, "0")}`;

  const exams = await prisma.medicalExamRecord.findMany();
  const examsByEmp = new Map();
  for (const x of exams) {
    if (!examsByEmp.has(x.employeeId)) examsByEmp.set(x.employeeId, []);
    examsByEmp.get(x.employeeId).push(x);
  }
  const checks = await prisma.medicalCheck.findMany({ where: { checkType: MEDICAL_CHECK_TYPE } });
  const checkByEmp = new Map();
  for (const c of checks) {
    const prev = checkByEmp.get(c.employeeId);
    // ใบที่ผูก requirement ก่อน แล้วค่อยใบที่หมดอายุช้าสุด
    if (
      !prev ||
      (!!c.medicalRequirementId && !prev.medicalRequirementId) ||
      (!!c.medicalRequirementId === !!prev.medicalRequirementId &&
        (c.expiryDate?.getTime() || 0) > (prev.expiryDate?.getTime() || 0))
    )
      checkByEmp.set(c.employeeId, c);
  }

  const report = {
    kind: "pe",
    dryRun,
    fileName,
    sheetName: parsed.sheetName,
    headerRow: parsed.headerRow,
    newSseRow: parsed.newSseRow,
    columnsFound: parsed.columnsFound,
    missingColumns: parsed.missingOptional,
    unknownHeaders: parsed.unknownHeaders,
    rowsInFile: parsed.records.length,
    employeesMatched: 0,
    matchedByEnglish: 0,
    matchedByEnglishList: [],
    notFound: [],
    createMissing,
    created: [],
    duplicatesInFile: [],
    noExamDate: [],
    backfills: [],
    roster: { permanent: [], newSse: [], sseConflicts: [] },
    counts: {
      examCreate: 0,
      examUpdate: 0,
      examUnchanged: 0,
      medicalSync: 0,
      employeeInfo: 0,
      employeeCreate: 0,
      permanentSet: 0,
      newSseSet: 0,
      errors: 0,
    },
    changes: [],
    changesTruncated: false,
    errors: [],
    warnings: [],
  };
  if (!parsed.newSseRow) report.warnings.push('ไม่พบแถว "New SSE" — ทุกคนในไฟล์จะถูกนับเป็น Permanent');
  const pushChange = (c) => {
    if (report.changes.length < MAX_CHANGE_ROWS) report.changes.push(c);
    else report.changesTruncated = true;
  };

  const seen = new Map();
  for (const rec of parsed.records) {
    let emp = byName.get(looseKey(rec.nameTH));
    if (!emp && rec.nameEN) {
      emp = byName.get(looseKey(rec.nameEN));
      if (emp) {
        report.matchedByEnglish++;
        report.matchedByEnglishList.push({
          row: rec.rowNo,
          fileTH: rec.nameTH,
          fileEN: rec.nameEN,
          systemTH: emp.fullNameTH || "-",
          employee: `${emp.empId || emp.empCode} ${emp.fullNameEN || emp.fullName}`,
        });
      }
    }
    if (!emp) {
      report.notFound.push({ row: rec.rowNo, nameTH: rec.nameTH, nameEN: rec.nameEN, section: rec.section });
      if (!createMissing || !(rec.nameEN || rec.nameTH)) continue;
      // พนักงานใหม่ — id ได้ตอนสร้างจริงใน transaction (op แรก)
      emp = { id: null, isNew: true, tmpKey: `new:${rec.rowNo}`, empCode: newEmpCode() };
      for (const n of [rec.nameTH, rec.nameEN]) if (looseKey(n)) byName.set(looseKey(n), emp); // แถวซ้ำ → duplicate
    }
    const seenKey = emp.id || emp.tmpKey;
    if (seen.has(seenKey)) {
      report.duplicatesInFile.push({ row: rec.rowNo, firstRow: seen.get(seenKey), name: rec.nameTH || rec.nameEN });
      continue;
    }
    seen.set(seenKey, rec.rowNo);
    if (!emp.isNew) report.employeesMatched++;

    const who = emp.isNew
      ? `${emp.empCode} ${rec.nameEN || rec.nameTH}`
      : `${emp.empId || emp.empCode} ${emp.fullNameEN || emp.fullName}`;
    const ops = [];
    let needRecompute = false;

    // ── ข้อมูลพนักงาน: เติมเฉพาะช่องว่าง + Permanent / NEW SSE ──
    const empData = {};
    const filled = {};
    // ชื่อไทย/อังกฤษ — เติมเฉพาะเมื่อในระบบยังว่าง (เช่นคนที่จับคู่ด้วยชื่ออังกฤษ)
    if (!emp.isNew && !emp.fullNameTH && rec.nameTH) filled.fullNameTH = rec.nameTH;
    if (!emp.isNew && !emp.fullNameEN && rec.nameEN) filled.fullNameEN = rec.nameEN;
    if (!emp.workplace && rec.emp.workplace) filled.workplace = rec.emp.workplace;
    if (!emp.division && rec.emp.division) filled.division = rec.emp.division;
    if (!emp.birthDate && rec.emp.birthDate) filled.birthDate = rec.emp.birthDate;
    if (Object.keys(filled).length && emp.isNew) {
      Object.assign(empData, filled);
    } else if (Object.keys(filled).length) {
      Object.assign(empData, filled);
      report.backfills.push({
        employee: who,
        fields: Object.fromEntries(Object.entries(filled).map(([k, v]) => [k, v instanceof Date ? ymd(v) : v])),
      });
    }
    if (rec.section === "permanent") {
      if (!emp.isPermanent) {
        empData.isPermanent = true;
        report.counts.permanentSet++;
        report.roster.permanent.push({ row: rec.rowNo, employee: who });
      }
    } else if (!emp.sseLevel) {
      empData.sseLevel = "new_sse";
      report.counts.newSseSet++;
      report.roster.newSse.push({ row: rec.rowNo, employee: who });
    } else if (emp.sseLevel !== "new_sse") {
      report.roster.sseConflicts.push({ row: rec.rowNo, employee: who, current: emp.sseLevel });
    }
    if (emp.isNew) {
      const pos = posByKey.get(looseKey(rec.emp.position)) || null;
      const createData = {
        empCode: emp.empCode,
        fullName: rec.nameEN || rec.nameTH, // ระบบเดิมเก็บชื่ออังกฤษไว้ที่ fullName
        fullNameEN: rec.nameEN || null,
        fullNameTH: rec.nameTH || null,
        positionId: pos?.id || null,
        isOffshore: true,
        ...empData,
      };
      report.counts.employeeCreate++;
      report.created.push({
        row: rec.rowNo,
        empCode: emp.empCode,
        nameTH: rec.nameTH,
        nameEN: rec.nameEN,
        position: rec.emp.position,
        positionMatched: pos?.name || null,
        section: rec.section,
      });
      ops.push(async (tx) => {
        const created = await tx.employee.create({ data: createData, select: { id: true } });
        emp.id = created.id;
      });
    } else if (Object.keys(empData).length) {
      report.counts.employeeInfo++;
      ops.push((tx) => tx.employee.update({ where: { id: emp.id }, data: empData }));
    }

    // ── PE record ──
    const x = rec.exam;
    if (!x.examDate) {
      report.noExamDate.push({ row: rec.rowNo, employee: who });
    } else {
      const list = examsByEmp.get(emp.id) || [];
      const existing = list.find((e) => sameDay(e.examDate, x.examDate));
      if (existing) {
        const data = {};
        const diffs = [];
        for (const [k, type] of Object.entries(EXAM_FIELD_TYPES)) {
          if (k === "examDate") continue;
          const v = x[k];
          if (v === null || v === undefined) continue; // ช่องว่างในไฟล์ → ไม่แตะ
          if (sameValue(type, v, existing[k])) continue;
          data[k] = v;
          diffs.push(`${FIELD_LABEL[k] || k}: ${short(fmtVal(type, existing[k]))} → ${short(fmtVal(type, v))}`);
        }
        if (diffs.length) {
          report.counts.examUpdate++;
          needRecompute = "healthRisk" in data;
          pushChange({ employee: who, kind: "update", examDate: ymd(x.examDate), detail: diffs.join(" · ") });
          ops.push((tx) =>
            tx.medicalExamRecord.update({
              where: { id: existing.id },
              data: { ...data, source: existing.source || "excel_import", sourceFile: fileName },
            }),
          );
        } else {
          report.counts.examUnchanged++;
        }
      } else {
        report.counts.examCreate++;
        needRecompute = true;
        const latest = list.reduce((a, b) => ((b.examDate?.getTime() || 0) > (a?.examDate?.getTime() || 0) ? b : a), null);
        const data = Object.fromEntries(Object.entries(x).filter(([, v]) => v !== null && v !== undefined));
        pushChange({
          employee: who,
          kind: "create",
          examDate: ymd(x.examDate),
          detail:
            latest && isNewerDay(latest.examDate, x.examDate)
              ? `เก่ากว่า record ล่าสุด (${ymd(latest.examDate)}) — เก็บเป็นประวัติ`
              : `Health Risk: ${x.healthRisk || "-"}`,
        });
        ops.push((tx) =>
          tx.medicalExamRecord.create({
            data: {
              ...data,
              employeeId: emp.id,
              version: list.reduce((m, e) => Math.max(m, e.version || 0), 0) + 1,
              isLatest: false, // คำนวณใหม่ด้านล่าง
              source: "excel_import",
              sourceFile: fileName,
            },
          }),
        );
      }

      // ── Medical Check-up: วันตรวจใหม่กว่าเดิม → ขยับวันตรวจ/วันหมดอายุ ──
      const chk = checkByEmp.get(emp.id);
      if (!chk || isNewerDay(x.examDate, chk.issuedDate)) {
        report.counts.medicalSync++;
        const data = { issuedDate: x.examDate, expiryDate: plusOneYear(x.examDate) };
        pushChange({
          employee: who,
          kind: chk ? "update" : "create",
          examDate: ymd(x.examDate),
          detail: `Medical Check-up: ${chk ? `${ymd(chk.issuedDate) || "-"} → ` : ""}${ymd(data.issuedDate)} (หมดอายุ ${ymd(data.expiryDate)})`,
        });
        ops.push((tx) =>
          chk
            ? tx.medicalCheck.update({ where: { id: chk.id }, data })
            : tx.medicalCheck.create({
                data: {
                  ...data,
                  employeeId: emp.id,
                  checkType: MEDICAL_CHECK_TYPE,
                  medicalRequirementId: medicalRequirement?.id || null,
                  status: "pending", // Fit/Unfit เป็นการตัดสินของ HR — import ไม่เดา
                },
              }),
        );
      }
    }

    // ── หา record ล่าสุดใหม่ + sync Employee.healthRisk (เหมือน workerService) ──
    if (needRecompute) {
      ops.push(async (tx) => {
        const all = await tx.medicalExamRecord.findMany({ where: { employeeId: emp.id } });
        if (!all.length) return;
        const winner = all.reduce((a, b) =>
          (b.examDate ? b.examDate.getTime() : -Infinity) > (a.examDate ? a.examDate.getTime() : -Infinity) ? b : a,
        );
        await tx.medicalExamRecord.updateMany({ where: { employeeId: emp.id, NOT: { id: winner.id } }, data: { isLatest: false } });
        await tx.medicalExamRecord.update({ where: { id: winner.id }, data: { isLatest: true } });
        await tx.employee.update({ where: { id: emp.id }, data: { healthRisk: winner.healthRisk || null } });
      });
    }

    if (!dryRun && ops.length) {
      try {
        await prisma.$transaction(
          async (tx) => {
            for (const op of ops) await op(tx);
          },
          { timeout: 30000 },
        );
      } catch (err) {
        report.counts.errors++;
        report.errors.push({ row: rec.rowNo, employee: who, message: err.message });
      }
    }
  }

  return report;
}
