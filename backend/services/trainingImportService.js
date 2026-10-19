// ============================================================
// services/trainingImportService.js
// นำเข้า Training / Medical / Passport จากไฟล์ Excel ของ HR
// ("Employee Training Offshore-Chevron dd-mm-yyyy.xlsx" — sheet "Record")
//
// ใช้ได้กับไฟล์ต้นฉบับของ HR โดยตรง ไม่ต้องทำไฟล์ CLEAN:
//   - หาแถวหัวตารางเองจากคำว่า "ID Employee"
//   - row หัวตาราง-2 = ชื่อกลุ่ม/ชื่อ training (merge cell → เติมให้คอลัมน์ถัดไป)
//   - row หัวตาราง   = ชื่อ field เช่น "Completed date310", "Expire Date311"
//   - หาคอลัมน์จากชื่อหัว ไม่ fix เลขคอลัมน์ → HR แทรก/ซ่อนคอลัมน์ก็ยังอ่านได้
//
// dryRun = true  → ไม่เขียน DB คืนรายงานว่าจะเกิดอะไรขึ้น
// dryRun = false → เขียนจริง (ทีละพนักงานใน transaction)
//
// กติกา:
//   - จับคู่พนักงานด้วย Employee ID (empId) ก่อน → ไม่เจอค่อยใช้ชื่อ (TH/EN)
//   - วันที่ไม่เปลี่ยน → ข้าม (ไม่สร้าง version ใหม่ซ้ำ)
//   - ช่องว่าง / N/A / Pending → ไม่ลบข้อมูลเดิม
//   - backfill empId / ชื่อไทย / ชื่ออังกฤษ เฉพาะเมื่อในระบบยังว่าง
// ============================================================
import xlsx from "xlsx";
import prisma from "../config/prisma.js";

const DEFAULT_CLIENT = "Chevron";
const PREFERRED_SHEET = "Record";
const MEDICAL_CHECK_TYPE = "Medical Check up";
const MEDICAL_CHECK_TYPE_2 = "Medical Check up 2";
const REMIND_DAYS = 30;
const NO_EXPIRY_YEAR = 2099;
const MAX_CHANGE_ROWS = 500; // จำนวนรายการเปลี่ยนแปลงที่ส่งกลับไปแสดง (กัน response ใหญ่เกิน)

// ── text helpers ──
const cleanText = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
  return s || null;
};
const BLANK_RE = /^(-|n\/?a|#value!|#n\/a|pending|if required|none|no)$/i;
const isBlankLike = (s) => !s || BLANK_RE.test(String(s).trim());

// key แบบหลวม — ไม่สนตัวพิมพ์/ช่องว่าง/เครื่องหมาย ใช้จับคู่ชื่อ
const looseKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s\-_/().,:;'"&]+/g, "");

// ตัดวงเล็บบอกอายุ cert ท้ายชื่อ เช่น "(3 Year)", "(2 , 3 Year)", "(No expire)"
const PERIOD_SUFFIX_RE =
  /\s*\(\s*(?:\d+\s*,?\s*)*(?:\d+\s*years?|no\s*expire)\s*\)\s*$/i;
const trainingNameOf = (s) =>
  cleanText(String(s || "").replace(PERIOD_SUFFIX_RE, ""));

// "Completed date310" → "completed date"
const fieldKey = (s) =>
  (cleanText(s) || "")
    .toLowerCase()
    .replace(/\d+$/, "")
    .trim();

const digitsKey = (s) => String(s ?? "").replace(/\s+/g, "").trim();

// ── date helpers (เก็บเป็นเที่ยงคืน UTC เสมอ — เทียบวันได้ตรง) ──
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const inRange = (d) => {
  if (!d || isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  return y < 1990 || y > 2100 ? null : d;
};
function parseDate(val) {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) {
    return inRange(
      new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate())),
    );
  }
  if (typeof val === "number") {
    return inRange(new Date(EXCEL_EPOCH + Math.round(val) * 86400000));
  }
  const s = String(val).trim();
  if (isBlankLike(s) || s.startsWith("=")) return null;
  if (/^\d{4,6}(\.\d+)?$/.test(s)) {
    return inRange(new Date(EXCEL_EPOCH + Math.round(Number(s)) * 86400000));
  }
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // d/m/yyyy
  if (m) return inRange(new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); // yyyy-mm-dd
  if (m) return inRange(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
  return null; // รูปแบบอื่น (เช่น "02-มี.ค.-2026") ไม่เดา
}
const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const sameDay = (a, b) => ymd(a) === ymd(b);
const remindOf = (exp) =>
  exp ? new Date(exp.getTime() - REMIND_DAYS * 86400000) : null;

function trainingStatus(completed, expiry) {
  if (!completed && !expiry) return null;
  if (!expiry || expiry.getUTCFullYear() >= NO_EXPIRY_YEAR) return "completed";
  const now = Date.now();
  if (expiry.getTime() < now) return "overdue";
  if (expiry.getTime() < now + 90 * 86400000) return "due_soon";
  return "completed";
}
const medicalStatus = (exp) =>
  !exp ? "pending" : exp.getTime() < Date.now() ? "overdue" : "passed";

// ============================================================
// 1) อ่านไฟล์ → โครงสร้างข้อมูล (ไม่แตะ DB)
// ============================================================
export function parseTrainingWorkbook(buffer) {
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: false });

  const findHeaderRow = (rows) =>
    rows
      .slice(0, 30)
      .findIndex((r) => (r || []).some((c) => /^id\s*employ/i.test(cleanText(c) || "")));

  // เลือก sheet: "Record" ก่อน ไม่มีก็หา sheet แรกที่มี "ID Employee"
  const names = [
    ...wb.SheetNames.filter((n) => n.trim().toLowerCase() === PREFERRED_SHEET.toLowerCase()),
    ...wb.SheetNames,
  ];
  let sheetName = null;
  let rows = null;
  let headerIdx = -1;
  for (const n of names) {
    const r = xlsx.utils.sheet_to_json(wb.Sheets[n], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
    const h = findHeaderRow(r);
    if (h >= 0) {
      sheetName = n;
      rows = r;
      headerIdx = h;
      break;
    }
  }
  if (!rows) {
    throw new Error('ไม่พบหัวตาราง "ID Employee" ในไฟล์นี้ — ไฟล์ไม่ตรงรูปแบบ Training Record');
  }

  const header = rows[headerIdx] || [];
  const groupRow = rows[headerIdx - 2] || [];
  const width = Math.max(header.length, groupRow.length);

  // เติมชื่อกลุ่มให้คอลัมน์ที่ merge (ค่าอยู่แค่คอลัมน์แรกของกลุ่ม)
  const group = [];
  let last = null;
  for (let c = 0; c < width; c++) {
    const g = cleanText(groupRow[c]);
    if (g) last = g;
    group[c] = last;
  }
  const field = Array.from({ length: width }, (_, c) => fieldKey(header[c]));
  const grp = (c) => (group[c] || "").toLowerCase();

  const findCol = (pred, from = 0, to = width) => {
    for (let c = from; c < to; c++) if (pred(field[c], c)) return c;
    return -1;
  };

  const col = {
    id: findCol((f) => f.startsWith("id employ")),
    nameEN: findCol((f) => f.startsWith("name")),
    nameTH: findCol((f) => f.includes("ชื่อ")),
    position: findCol((f) => f.startsWith("position")),
    covid: findCol((f) => f.includes("vaccin") || f.includes("covid")),
  };
  if (col.id < 0 || col.nameEN < 0) {
    throw new Error('ไม่พบคอลัมน์ "ID Employee" หรือ "Name" ในแถวหัวตาราง');
  }

  // Passport / PDPA — หาจากชื่อกลุ่ม
  const passportCols = [];
  for (let c = 0; c < width; c++) if (grp(c).includes("passport")) passportCols.push(c);
  const passportStart = passportCols.length ? passportCols[0] : width;
  const passport = passportCols.length
    ? {
        no: passportCols.find((c) => field[c].startsWith("passport")) ?? -1,
        issue: passportCols.find((c) => field[c].startsWith("completed") || field[c].startsWith("issue")) ?? -1,
        expiry: passportCols.find((c) => field[c].startsWith("expire")) ?? -1,
      }
    : null;
  const pdpaCol = (() => {
    for (let c = 0; c < width; c++) if (grp(c) === "pdpa") return c;
    return -1;
  })();

  // Medical — ทุก "Hospital" ก่อนส่วน Passport = 1 ชุด (ชุดที่ 2 = Medical Check up 2)
  const medical = [];
  for (let c = 0; c < passportStart; c++) {
    if (!field[c].startsWith("hospital")) continue;
    let next = passportStart;
    for (let k = c + 1; k < passportStart; k++) {
      if (field[k].startsWith("hospital")) {
        next = k;
        break;
      }
    }
    medical.push({
      hospital: c,
      issued: findCol((f) => f.startsWith("issued"), c + 1, next),
      expired: findCol((f) => f.startsWith("expire"), c + 1, next),
    });
  }

  // Training — คอลัมน์หลัง PDPA / Passport ที่เป็น Completed / Expire
  const trainingStart = Math.max(pdpaCol, ...passportCols, col.covid, 0) + 1;
  const trainingMap = new Map();
  for (let c = trainingStart; c < width; c++) {
    const f = field[c];
    const isCompleted = f.startsWith("completed");
    const isExpiry = f.startsWith("expire");
    if (!isCompleted && !isExpiry) continue;
    const name = trainingNameOf(group[c]);
    if (!name) continue;
    if (!trainingMap.has(name)) {
      trainingMap.set(name, { name, completedCol: -1, expiryCol: -1 });
    }
    const t = trainingMap.get(name);
    if (isCompleted && t.completedCol < 0) t.completedCol = c;
    if (isExpiry && t.expiryCol < 0) t.expiryCol = c;
  }
  const trainings = [...trainingMap.values()];

  // ── แถวข้อมูล ──
  const records = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const empId = cleanText(row[col.id]);
    const nameEN = cleanText(row[col.nameEN]);
    if (!empId || isBlankLike(empId) || !nameEN || nameEN.startsWith("=")) continue;

    const get = (c) => (c >= 0 ? row[c] : null);
    records.push({
      rowNo: r + 1,
      empId,
      nameEN,
      nameTH: cleanText(get(col.nameTH)),
      position: cleanText(get(col.position)),
      covid: (() => {
        const v = cleanText(get(col.covid));
        return isBlankLike(v) ? null : v;
      })(),
      pdpa: (() => {
        const v = cleanText(get(pdpaCol));
        return v && /^(yes|y|true|✓|ยินยอม)$/i.test(v) ? true : null;
      })(),
      medical: medical.map((m) => ({
        hospital: (() => {
          const v = cleanText(get(m.hospital));
          return isBlankLike(v) ? null : v;
        })(),
        issued: parseDate(get(m.issued)),
        expiry: parseDate(get(m.expired)),
      })),
      passport: passport
        ? {
            no: (() => {
              const v = cleanText(get(passport.no));
              return isBlankLike(v) ? null : v;
            })(),
            issue: parseDate(get(passport.issue)),
            expiry: parseDate(get(passport.expiry)),
          }
        : null,
      trainings: trainings.map((t) => ({
        name: t.name,
        completed: parseDate(get(t.completedCol)),
        expiry: parseDate(get(t.expiryCol)),
      })),
    });
  }

  return {
    sheetName,
    headerRow: headerIdx + 1,
    columns: { ...col, pdpa: pdpaCol, passport, medical, trainingStart },
    trainings,
    records,
  };
}

// ============================================================
// 2) เทียบกับ DB + เขียน (ถ้าไม่ใช่ dryRun)
// ============================================================
export async function runTrainingImport({
  buffer,
  fileName = "upload.xlsx",
  dryRun = true,
  createMissing = false, // true = คนที่ไม่พบในระบบ → สร้างพนักงานใหม่
  clientName = DEFAULT_CLIENT,
}) {
  const parsed = parseTrainingWorkbook(buffer);

  const client = await prisma.client.findFirst({ where: { name: clientName } });
  if (!client) throw new Error(`ไม่พบ client "${clientName}"`);
  const contract = await prisma.contract.findFirst({
    where: { clientId: client.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!contract) throw new Error(`ไม่พบ contract ที่ active ของ ${clientName}`);
  const medicalRequirement = await prisma.medicalRequirement.findFirst({
    where: { clientId: client.id, name: { contains: "Medical Check" } },
  });

  // ── mapping ชื่อ training ในไฟล์ → ClientTraining ──
  // จับได้ทั้ง nameAlias, ชื่อกลาง และ "ชื่อที่ HR ใช้ในไฟล์" (GlobalTraining.fullName)
  const clientTrainings = await prisma.clientTraining.findMany({
    where: { contractId: contract.id },
    include: { globalTraining: true },
  });
  const ctByKey = new Map();
  for (const ct of clientTrainings) {
    for (const n of [ct.nameAlias, ct.globalTraining?.name, ct.globalTraining?.fullName]) {
      const k = looseKey(trainingNameOf(n));
      if (k && !ctByKey.has(k)) ctByKey.set(k, ct);
    }
  }
  const unmapped = [];
  const mappedTrainings = parsed.trainings.map((t) => {
    const ct = ctByKey.get(looseKey(t.name)) || null;
    if (!ct) {
      const filled = parsed.records.filter((r) =>
        r.trainings.some((x) => x.name === t.name && (x.completed || x.expiry)),
      ).length;
      unmapped.push({ name: t.name, filledRows: filled });
    }
    return { ...t, ct };
  });

  // ── พนักงาน ──
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      empCode: true,
      empId: true,
      fullName: true,
      fullNameTH: true,
      fullNameEN: true,
      covidVac: true,
      pdpaConsent: true,
    },
  });
  const byEmpId = new Map();
  const byName = new Map();
  for (const e of employees) {
    if (e.empId) byEmpId.set(digitsKey(e.empId), e);
    for (const n of [e.fullNameTH, e.fullNameEN, e.fullName]) {
      const k = looseKey(n);
      if (k && !byName.has(k)) byName.set(k, e);
    }
  }

  // ── สำหรับสร้างพนักงานใหม่: ตำแหน่ง + รหัส EXPT ถัดไป (รูปแบบเดียวกับหน้า Add Worker) ──
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

  // ── ข้อมูลเดิม (โหลดครั้งเดียว) ──
  const existingTrainings = await prisma.employeeTraining.findMany({
    where: { contractId: contract.id, isLatest: true },
    select: { id: true, employeeId: true, globalTrainingId: true, completedDate: true, expiryDate: true, version: true },
  });
  const etKey = (empId, gtId) => `${empId}|${gtId}`;
  const etMap = new Map(existingTrainings.map((t) => [etKey(t.employeeId, t.globalTrainingId), t]));

  const medTypes = [MEDICAL_CHECK_TYPE, MEDICAL_CHECK_TYPE_2];
  const existingMed = medicalRequirement
    ? await prisma.medicalCheck.findMany({
        where: { medicalRequirementId: medicalRequirement.id, checkType: { in: medTypes } },
      })
    : [];
  const medMap = new Map(existingMed.map((m) => [`${m.employeeId}|${m.checkType}`, m]));

  const passports = await prisma.passport.findMany();
  const ppMap = new Map(passports.map((p) => [p.employeeId, p]));

  // ── report ──
  const report = {
    dryRun,
    fileName,
    sheetName: parsed.sheetName,
    headerRow: parsed.headerRow,
    client: clientName,
    contract: contract.name,
    rowsInFile: parsed.records.length,
    trainingColumns: parsed.trainings.length,
    mappedTrainings: mappedTrainings.filter((t) => t.ct).length,
    unmappedTrainings: unmapped,
    employeesMatched: 0,
    matchedByName: 0,
    notFound: [],
    createMissing,
    created: [], // พนักงานใหม่ที่สร้าง (หรือจะสร้าง ถ้าเป็น preview)
    duplicatesInFile: [],
    backfills: [],
    counts: {
      trainingCreate: 0,
      trainingUpdate: 0,
      trainingUnchanged: 0,
      medicalCreate: 0,
      medicalUpdate: 0,
      medicalUnchanged: 0,
      passportUpsert: 0,
      employeeInfoUpdate: 0,
      employeeCreate: 0,
      errors: 0,
    },
    changes: [],
    changesTruncated: false,
    errors: [],
    warnings: medicalRequirement
      ? []
      : ['ไม่พบ MedicalRequirement "Medical Check" ของ client นี้ — ข้ามผลตรวจสุขภาพ'],
  };
  const pushChange = (c) => {
    if (report.changes.length < MAX_CHANGE_ROWS) report.changes.push(c);
    else report.changesTruncated = true;
  };

  const seen = new Map(); // employee.id → rowNo (กันพนักงานซ้ำในไฟล์)

  for (const rec of parsed.records) {
    let emp = byEmpId.get(digitsKey(rec.empId));
    let matchedBy = "empId";
    if (!emp) {
      emp = byName.get(looseKey(rec.nameTH)) || byName.get(looseKey(rec.nameEN));
      matchedBy = "name";
    }
    if (!emp) {
      report.notFound.push({ row: rec.rowNo, empId: rec.empId, nameEN: rec.nameEN, nameTH: rec.nameTH });
      if (!createMissing) continue;
      // พนักงานใหม่ — id จะได้ตอนสร้างจริงใน transaction (op แรก)
      emp = { id: null, isNew: true, tmpKey: `new:${rec.rowNo}`, empCode: newEmpCode() };
      byEmpId.set(digitsKey(rec.empId), emp); // แถวซ้ำในไฟล์จะถูกจับเป็น duplicate
      matchedBy = "new";
    }
    const seenKey = emp.id || emp.tmpKey;
    if (seen.has(seenKey)) {
      report.duplicatesInFile.push({ row: rec.rowNo, firstRow: seen.get(seenKey), empId: rec.empId, nameEN: rec.nameEN });
      continue;
    }
    seen.set(seenKey, rec.rowNo);
    if (matchedBy !== "new") report.employeesMatched++;
    if (matchedBy === "name") report.matchedByName++;

    const who = `${rec.empId} ${rec.nameEN}`;
    const ops = []; // ฟังก์ชัน (tx) => Promise — รันใน transaction ตอนเขียนจริง

    if (emp.isNew) {
      const pos = posByKey.get(looseKey(rec.position)) || null;
      const createData = {
        empCode: emp.empCode,
        fullName: rec.nameEN, // ระบบเดิมเก็บชื่ออังกฤษไว้ที่ fullName
        fullNameEN: rec.nameEN,
        fullNameTH: rec.nameTH || null,
        empId: rec.empId,
        positionId: pos?.id || null,
        isOffshore: true,
        covidVac: rec.covid || null,
        pdpaConsent: rec.pdpa || null,
      };
      report.counts.employeeCreate++;
      report.created.push({
        row: rec.rowNo,
        empCode: emp.empCode,
        empId: rec.empId,
        nameEN: rec.nameEN,
        nameTH: rec.nameTH,
        position: rec.position,
        positionMatched: pos?.name || null,
      });
      ops.push(async (tx) => {
        const created = await tx.employee.create({ data: createData, select: { id: true } });
        emp.id = created.id;
      });
    }

    // ── backfill รหัส/ชื่อ (เฉพาะช่องที่ยังว่างในระบบ) ──
    const empData = {};
    if (emp.isNew) {
      // ข้อมูลครบแล้วตอนสร้าง — ข้ามส่วน backfill
    } else if (!emp.empId && !byEmpId.has(digitsKey(rec.empId))) {
      empData.empId = rec.empId;
      byEmpId.set(digitsKey(rec.empId), emp); // กันอีกแถวในไฟล์ backfill รหัสเดียวกันซ้ำ
    }
    if (!emp.isNew && !emp.fullNameTH && rec.nameTH) empData.fullNameTH = rec.nameTH;
    if (!emp.isNew && !emp.fullNameEN && rec.nameEN) empData.fullNameEN = rec.nameEN;
    if (Object.keys(empData).length) {
      report.backfills.push({ employee: who, empCode: emp.empCode, fields: { ...empData } });
    }
    // covid / pdpa — อัปเดตเมื่อไฟล์มีค่า (ช่องว่างไม่ลบของเดิม)
    if (!emp.isNew && rec.covid && rec.covid !== emp.covidVac) empData.covidVac = rec.covid;
    if (!emp.isNew && rec.pdpa && emp.pdpaConsent !== true) empData.pdpaConsent = true;
    if (Object.keys(empData).length) {
      report.counts.employeeInfoUpdate++;
      ops.push((tx) => tx.employee.update({ where: { id: emp.id }, data: empData }));
    }

    // ── Medical Check up (ชุด 1, 2) ──
    if (medicalRequirement) {
      rec.medical.slice(0, 2).forEach((m, i) => {
        if (!m.issued && !m.expiry) return;
        const checkType = i === 0 ? MEDICAL_CHECK_TYPE : MEDICAL_CHECK_TYPE_2;
        const old = medMap.get(`${emp.id}|${checkType}`);
        if (
          old &&
          sameDay(old.issuedDate, m.issued) &&
          sameDay(old.expiryDate, m.expiry) &&
          (old.hospital || null) === (m.hospital || old.hospital || null)
        ) {
          report.counts.medicalUnchanged++;
          return;
        }
        const data = {
          hospital: m.hospital ?? old?.hospital ?? null,
          issuedDate: m.issued,
          expiryDate: m.expiry,
          remindDate: remindOf(m.expiry),
          remindDays: REMIND_DAYS,
          status: medicalStatus(m.expiry),
        };
        report.counts[old ? "medicalUpdate" : "medicalCreate"]++;
        pushChange({
          employee: who,
          item: checkType,
          kind: old ? "update" : "create",
          from: old ? `${ymd(old.issuedDate) || "-"} → ${ymd(old.expiryDate) || "-"}` : null,
          to: `${ymd(m.issued) || "-"} → ${ymd(m.expiry) || "-"}`,
        });
        ops.push((tx) =>
          tx.medicalCheck.upsert({
            where: {
              employeeId_checkType_medicalRequirementId: {
                employeeId: emp.id,
                checkType,
                medicalRequirementId: medicalRequirement.id,
              },
            },
            update: data,
            create: { ...data, employeeId: emp.id, checkType, medicalRequirementId: medicalRequirement.id },
          }),
        );
      });
    }

    // ── Passport ──
    const pp = rec.passport;
    if (pp && (pp.no || pp.issue || pp.expiry)) {
      const old = ppMap.get(emp.id);
      const changed =
        !old ||
        (pp.no && pp.no !== old.passportNo) ||
        (pp.issue && !sameDay(pp.issue, old.issueDate)) ||
        (pp.expiry && !sameDay(pp.expiry, old.expiryDate));
      if (changed) {
        report.counts.passportUpsert++;
        const data = {
          ...(pp.no ? { passportNo: pp.no } : {}),
          ...(pp.issue ? { issueDate: pp.issue } : {}),
          ...(pp.expiry ? { expiryDate: pp.expiry } : {}),
        };
        pushChange({
          employee: who,
          item: "Passport",
          kind: old ? "update" : "create",
          from: old ? `${old.passportNo || "-"} exp ${ymd(old.expiryDate) || "-"}` : null,
          to: `${pp.no || old?.passportNo || "-"} exp ${ymd(pp.expiry) || ymd(old?.expiryDate) || "-"}`,
        });
        ops.push((tx) =>
          tx.passport.upsert({
            where: { employeeId: emp.id },
            update: data,
            create: { employeeId: emp.id, ...data },
          }),
        );
      }
    }

    // ── Trainings ──
    mappedTrainings.forEach((t, i) => {
      if (!t.ct) return;
      const v = rec.trainings[i];
      if (!v.completed && !v.expiry) return; // ช่องว่าง/N/A/Pending → ไม่แตะของเดิม
      const gtId = t.ct.globalTrainingId;
      const old = etMap.get(etKey(emp.id, gtId));
      if (old && sameDay(old.completedDate, v.completed) && sameDay(old.expiryDate, v.expiry)) {
        report.counts.trainingUnchanged++;
        return;
      }
      const status = trainingStatus(v.completed, v.expiry);
      report.counts[old ? "trainingUpdate" : "trainingCreate"]++;
      pushChange({
        employee: who,
        item: t.ct.globalTraining?.name || t.name,
        kind: old ? "update" : "create",
        from: old ? `${ymd(old.completedDate) || "-"} → ${ymd(old.expiryDate) || "-"}` : null,
        to: `${ymd(v.completed) || "-"} → ${ymd(v.expiry) || "-"}`,
      });
      ops.push(async (tx) => {
        if (old) {
          await tx.employeeTraining.update({ where: { id: old.id }, data: { isLatest: false } });
        }
        await tx.employeeTraining.create({
          data: {
            employeeId: emp.id,
            rawTrainingName: t.name,
            globalTrainingId: gtId,
            clientTrainingId: t.ct.id,
            contractId: contract.id,
            completedDate: v.completed,
            expiryDate: v.expiry,
            remindDate: remindOf(v.expiry),
            remindDays: REMIND_DAYS,
            status,
            source: "excel_import",
            sourceFile: fileName,
            isLatest: true,
            version: old ? (old.version || 1) + 1 : 1,
          },
        });
      });
    });

    // ── เขียนจริง: ทีละพนักงาน ล้มคนเดียวไม่ลากคนอื่น ──
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
