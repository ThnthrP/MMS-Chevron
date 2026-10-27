import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ============================================================
// Manpower Calendar (เดิม Projects Overview)
//   getProjectsOverview()   — รายการ requirement ทั้งหมด + ขั้นตอนปัจจุบัน
//   getProjectOverview(id)  — requirement เดียว (หน้ารายละเอียด)
//
// ขั้นตอน (stages) ยึด flowchart ISO เป็นหลัก + แยกขั้นแบบระบบ CES ที่ช่วยให้เห็นจุดติดขัดชัดขึ้น
//   ISO 1  ลูกค้าแจ้งความต้องการ → บันทึกในระบบ ........ requirement
//   ISO 2  ตรวจสอบบุคลากร จัดรายชื่อ (Assign Names) ..... assign
//          (CES: Awaiting Check/Approval) ................ approval
//          (CES: Awaiting Respond/Confirmation) .......... confirm
//   ISO 3  อบรมความปลอดภัย · ตรวจ Certificate · สุขภาพ ... training
//   ISO 4  แจ้งรายละเอียดงาน · เตรียม PPE ............... briefing
//   ISO 8  ที่พัก · ตั๋ว · เรือ · รถรับส่ง — ไม่แสดงเป็นขั้น (บริษัทจองเดินทางนอกระบบ ไม่มีหน้าบันทึกใน MMS)
//   ISO 9  ตรวจแอลกอฮอล์ที่ Hangar/ท่าเรือ — ผ่าน/ไม่ผ่าน .. hangar
//   ISO 10 ปฏิบัติงาน ..................................... onsite
//   ISO 11 ครบกำหนด รับกลับ ............................... demob
//          (CES: Evaluated) .............................. evaluated
// ============================================================

// MobilizationTaskType → ขั้นตอน
const TASK_STAGE = {
  line_group: "briefing",
  ppe_preparation: "briefing",
  accounting_notify: "briefing",
  pre_field_training: "briefing",
  // vessel_booking / transport_booking / hotel_booking — ไม่นับเข้าขั้นใด (ไม่มีขั้น Travel Booking)
  alcohol_test: "hangar",
  drug_test: "hangar",
  ppe_inspection: "hangar",
  baggage_inspection: "hangar",
  blood_pressure_check: "hangar",
};

// label = ชื่อขั้น (ใช้คำเดียวกับเมนู/ปุ่มในระบบ) · hint = ทำที่ไหน / ผ่านเมื่อไร (แสดงเป็น tooltip)
export const STAGES = [
  { key: "requirement", label: "Requirement", iso: "ลูกค้าแจ้งความต้องการ · บันทึกในระบบ",
    hint: "สร้าง requirement และเพิ่มตำแหน่ง — Projects › + New requirement / หน้า Requirement · ผ่านเมื่อมีตำแหน่งอย่างน้อย 1 ตำแหน่ง" },
  { key: "assign", label: "Assign Names", iso: "ตรวจสอบบุคลากร · จัดรายชื่อ",
    hint: "Assign Names › กด + เพิ่ม · ผ่านเมื่อจัดคนครบทุกตำแหน่ง" },
  { key: "approval", label: "Approval", iso: "PE / ลูกค้าอนุมัติรายชื่อ",
    hint: "Assign Names › Approve · คนที่ % Match ไม่ถึง 100% ส่ง PE Approvals · ผ่านเมื่ออนุมัติครบและไม่มีคำขอค้างที่ PE" },
  { key: "confirm", label: "Worker Confirm", iso: "พนักงานตอบรับงาน",
    hint: "พนักงานกดตอบรับ/ปฏิเสธใน Worker App · ผ่านเมื่อทุกคนตอบรับ · มีคนปฏิเสธ = แดง" },
  { key: "training", label: "Training & Medical", iso: "อบรม · ตรวจ Certificate · ตรวจสุขภาพ",
    hint: "Training Bookings / Medical Bookings · ผ่านเมื่อผลตรวจสุขภาพใช้ได้ถึงวันเริ่มงานและไม่มีคำขออบรมค้าง" },
  { key: "briefing", label: "Pre-Field Training", iso: "แจ้งรายละเอียดงาน · อบรมก่อนลงงาน",
    hint: "Worker Schedule › Mobilization: อบรมก่อนปฏิบัติงานนอกพื้นที่ (Safety Oriented, 28 Days plan ฯลฯ) · ผ่านเมื่ออบรมครบทุกคน" },
  { key: "hangar", label: "Check In", iso: "ตรวจความพร้อมก่อนเดินทาง (Hangar / ท่าเรือ)",
    hint: "Worker Schedule › Mobilization: ตรวจแอลกอฮอล์ · สารเสพติด · PPE · กระเป๋า · ความดัน — ดูรายเที่ยวที่แท็บ Check In · ไม่ผ่าน = แดง" },
  { key: "onsite", label: "MOB", iso: "ปฏิบัติงาน",
    hint: "วัน MOB ที่ Worker Schedule · ผ่านเมื่อถึงวัน MOB ครบทุกคน" },
  { key: "demob", label: "D-MOB", iso: "ครบกำหนด · รับกลับ",
    hint: "วัน D-MOB ที่ Worker Schedule · ผ่านเมื่อถึงวัน D-MOB ครบทุกคน" },
  { key: "evaluated", label: "Review", iso: "ประเมินผลหลังจบงาน",
    hint: "Worker Schedule › Post-Project Review · ผ่านเมื่อประเมินครบทุกคนที่ลงงาน" },
];

const TASK_DONE = ["completed", "not_required"];

const projectInclude = {
  contract: { include: { client: true } },
  masterProjectRecord: { select: { projectCode: true } },
  _count: { select: { reviews: true } },
  requests: {
    include: {
      position: true,
      matchExceptions: { where: { status: "pending" }, select: { id: true } },
      bookings: {
        select: {
          id: true,
          employeeId: true,
          status: true,
          mobilizationTasks: {
            select: { taskType: true, status: true, resultStatus: true },
          },
        },
      },
      rounds: {
        orderBy: { round: "desc" },
        take: 1,
        include: {
          candidates: {
            select: {
              id: true,
              status: true,
              employeeId: true,
              workerConfirmStatus: true,
              employee: {
                select: {
                  fullName: true,
                  empCode: true,
                  empId: true,
                  position: { select: { name: true } },
                  medicalChecks: {
                    where: { checkType: "Medical Check up" },
                    select: { expiryDate: true, status: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  assignments: {
    include: {
      employee: {
        select: {
          fullName: true,
          empCode: true,
          empId: true,
          position: { select: { name: true } },
        },
      },
    },
    orderBy: { mobDate: "asc" },
  },
};

// ── สถานะแต่ละขั้น: done | current | todo | fail ──
function buildStages(ctx) {
  const {
    quantity,
    shortlisted,
    approved,
    pendingPE,
    confirmed,
    rejected,
    medicalIssues,
    pendingTraining,
    taskSummary,
    assignments,
    reviews,
    hasRequests,
    positions = 0,
    now,
  } = ctx;

  const s = {};
  // Requirement ผ่านเมื่อใส่ตำแหน่งแล้ว (เดิมผ่านเสมอ → "ยังไม่มีตำแหน่ง" ไปโผล่ที่ขั้น Assign Names)
  s.requirement = hasRequests
    ? { done: quantity > 0, note: `${positions} ตำแหน่ง · ${quantity} คน` }
    : { done: false, note: "ยังไม่มีตำแหน่ง" };
  s.assign = {
    done: hasRequests && quantity > 0 && shortlisted >= quantity,
    note: hasRequests ? `จัดแล้ว ${shortlisted}/${quantity}` : "",
  };
  s.approval = {
    done: quantity > 0 && approved >= quantity && pendingPE === 0,
    note:
      `อนุมัติ ${approved}/${quantity}` + (pendingPE ? ` · รอ PE ${pendingPE}` : ""),
  };
  s.confirm = {
    done: approved > 0 && confirmed >= approved,
    fail: rejected > 0,
    note: `ตอบรับ ${confirmed}/${approved}` + (rejected ? ` · ปฏิเสธ ${rejected}` : ""),
  };
  s.training = {
    done: approved > 0 && medicalIssues === 0 && pendingTraining === 0,
    note:
      [
        medicalIssues ? `สุขภาพ ${medicalIssues} คน` : "",
        pendingTraining ? `รอจัดอบรม ${pendingTraining}` : "",
      ]
        .filter(Boolean)
        .join(" · ") || (approved > 0 ? "พร้อม" : ""),
  };
  for (const key of ["briefing", "hangar"]) {
    const t = taskSummary[key];
    s[key] = {
      // ตรวจไม่ผ่าน (เช่น แอลกอฮอล์) = ยังไม่ผ่านขั้นนี้ ต้องส่งตัวกลับ / หาคนแทน
      done: t.total > 0 && t.done === t.total && t.failed === 0,
      fail: t.failed > 0,
      note: t.total > 0 ? `${t.done}/${t.total}` + (t.failed ? ` · ไม่ผ่าน ${t.failed}` : "") : "",
      // Pre-Field Training ยังไม่มีรายการให้บันทึก → ข้ามได้ ไม่ให้ค้างเป็น "ขั้นปัจจุบัน"
      // (Check In ไม่ข้าม — ต้องตรวจก่อนเดินทางเสมอ)
      skip: key !== "hangar" && t.total === 0 && assignments.length > 0,
    };
    if (s[key].skip) s[key].note = "ไม่มีรายการ";
  }
  const mobbed = assignments.filter((a) => a.mobDate && new Date(a.mobDate) <= now);
  const demobbed = assignments.filter(
    (a) => a.demobDate && new Date(a.demobDate) <= now,
  );
  // MOB / D-MOB / Review — นับเทียบจำนวนคนที่ต้องการ (เดิมเทียบแค่คนที่ลงตารางแล้ว
  // → ลงตาราง 1 จาก 13 คนก็ขึ้นเขียว)
  const crew = Math.max(quantity, assignments.length);
  s.onsite = {
    done: crew > 0 && mobbed.length >= crew,
    note: assignments.length ? `${mobbed.length}/${crew} คน` : "",
  };
  s.demob = {
    done: crew > 0 && demobbed.length >= crew,
    note: assignments.length ? `${demobbed.length}/${crew} คน` : "",
  };
  s.evaluated = {
    done: crew > 0 && demobbed.length >= crew && reviews >= crew,
    note: assignments.length ? `${Math.min(reviews, crew)}/${crew} คน` : "",
  };

  // ขั้นแรกที่ยังไม่ผ่าน = ขั้นปัจจุบัน (จุดที่ติดอยู่)
  let currentFound = false;
  return STAGES.map((st) => {
    const x = s[st.key];
    let state;
    if (x.done) state = "done";
    else if (x.skip) state = "skip";
    else if (!currentFound) {
      currentFound = true;
      state = x.fail ? "fail" : "current";
    } else state = x.fail ? "fail" : "todo";
    return { ...st, state, note: x.note };
  });
}

function mapProject(p, pendingTrainingByEmp, now) {
  const requests = p.requests.map((req) => {
    const candidates = req.rounds[0]?.candidates ?? [];
    const shortlisted = candidates.length;
    const approved = candidates.filter((c) => c.status === "approved").length;
    const remaining = Math.max(0, req.quantity - shortlisted);
    return {
      id: req.id,
      position: req.position?.name,
      quantity: req.quantity,
      shortlisted,
      approved,
      remaining,
      pendingPE: req.matchExceptions.length,
      shortlistedPct:
        req.quantity > 0 ? Math.round((shortlisted / req.quantity) * 100) : 0,
    };
  });

  // คนที่ถูกอนุมัติ (approved candidates) — ใช้ขั้น Confirm / Training & Medical
  const approvedCands = p.requests.flatMap((req) =>
    (req.rounds[0]?.candidates ?? [])
      .filter((c) => c.status === "approved")
      .map((c) => ({ ...c, requestedPosition: req.position?.name ?? null })),
  );

  const requestedPositionByEmp = new Map(
    approvedCands.map((c) => [c.employeeId, c.requestedPosition]),
  );

  // ผลตรวจสุขภาพต้องยังไม่หมดก่อนวันเริ่มงาน (ไม่มีวันเริ่ม → เทียบวันนี้)
  const mustValidOn = p.startDate && new Date(p.startDate) > now ? new Date(p.startDate) : now;
  const medicalOk = (c) => {
    const m = c.employee?.medicalChecks?.[0];
    return !!m?.expiryDate && new Date(m.expiryDate) >= mustValidOn && m.status !== "failed";
  };

  const taskSummary = {
    briefing: { total: 0, done: 0, failed: 0 },
    hangar: { total: 0, done: 0, failed: 0 },
  };
  const hangarFailByEmp = new Set();
  for (const req of p.requests) {
    for (const b of req.bookings) {
      if (b.status === "cancelled") continue;
      for (const t of b.mobilizationTasks) {
        const stage = TASK_STAGE[t.taskType];
        if (!stage) continue;
        taskSummary[stage].total++;
        if (TASK_DONE.includes(t.status)) taskSummary[stage].done++;
        if (t.resultStatus === "fail") {
          taskSummary[stage].failed++;
          hangarFailByEmp.add(b.employeeId);
        }
      }
    }
  }

  const quantity = requests.reduce((n, r) => n + r.quantity, 0);
  const pendingTraining = approvedCands.reduce(
    (n, c) => n + (pendingTrainingByEmp.get(c.employeeId) || 0),
    0,
  );

  const stages = buildStages({
    quantity,
    shortlisted: requests.reduce((n, r) => n + r.shortlisted, 0),
    approved: approvedCands.length,
    pendingPE: requests.reduce((n, r) => n + r.pendingPE, 0),
    confirmed: approvedCands.filter((c) => c.workerConfirmStatus === "confirmed").length,
    rejected: approvedCands.filter((c) => c.workerConfirmStatus === "rejected").length,
    medicalIssues: approvedCands.filter((c) => !medicalOk(c)).length,
    pendingTraining,
    taskSummary,
    assignments: p.assignments,
    reviews: p._count.reviews,
    hasRequests: p.requests.length > 0,
    positions: p.requests.length,
    now,
  });

  const employees = p.assignments.map((a) => ({
    employeeId: a.employeeId,
    fullName: a.employee?.fullName,
    empCode: a.employee?.empCode,
    empId: a.employee?.empId,
    employeePosition: a.employee?.position?.name ?? null,
    requestedPosition:
      requestedPositionByEmp.get(a.employeeId) ?? a.employee?.position?.name ?? null,
    mobDate: a.mobDate,
    demobDate: a.demobDate,
    platform: a.platform,
    status: a.status,
    hangarFailed: hangarFailByEmp.has(a.employeeId),
  }));

  // คนที่อนุมัติแล้วแต่ยังไม่ลงตารางวันทำงาน — แสดงในหน้ารายละเอียด
  const assignedIds = new Set(p.assignments.map((a) => a.employeeId));
  const pendingWorkers = approvedCands
    .filter((c) => !assignedIds.has(c.employeeId))
    .map((c) => ({
      employeeId: c.employeeId,
      fullName: c.employee?.fullName,
      empCode: c.employee?.empCode,
      empId: c.employee?.empId,
      requestedPosition: c.requestedPosition,
      workerConfirmStatus: c.workerConfirmStatus,
      medicalOk: medicalOk(c),
      pendingTraining: pendingTrainingByEmp.get(c.employeeId) || 0,
    }));

  let tab;
  if (p.status === "completed") tab = "completed";
  else if (p.startDate && new Date(p.startDate) > now) tab = "upcoming";
  else tab = "in_progress";

  const current = stages.find((s) => s.state !== "done" && s.state !== "skip") || null;

  return {
    id: p.id,
    name: p.name,
    masterProjectRecord: p.masterProjectRecord, // { projectCode } — ON Number
    client: p.contract?.client?.name ?? null,
    contract: p.contract?.name ?? null,
    location: p.location,
    isOffshore: p.isOffshore,
    startDate: p.startDate,
    endDate: p.endDate,
    notes: p.notes,
    status: p.status,
    tab,
    requests,
    employees,
    pendingWorkers,
    stages,
    currentStage: current ? { key: current.key, label: current.label, state: current.state, note: current.note } : null,
  };
}

// คำขออบรมที่ยังรอ HR ต่อพนักงาน (Training Bookings สถานะ pending)
async function pendingTrainingMap(projects) {
  const ids = [
    ...new Set(
      projects.flatMap((p) =>
        p.requests.flatMap((r) => (r.rounds[0]?.candidates ?? []).map((c) => c.employeeId)),
      ),
    ),
  ];
  if (ids.length === 0) return new Map();
  const items = await prisma.trainingRequestItem.findMany({
    where: { employeeId: { in: ids }, batch: { status: "pending" } },
    select: { employeeId: true },
  });
  const m = new Map();
  for (const it of items) m.set(it.employeeId, (m.get(it.employeeId) || 0) + 1);
  return m;
}

export async function getProjectsOverview() {
  const projects = await prisma.project.findMany({
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  const pending = await pendingTrainingMap(projects);
  const result = projects.map((p) => mapProject(p, pending, now));

  return {
    stages: STAGES,
    upcoming: result.filter((p) => p.tab === "upcoming"),
    inProgress: result.filter((p) => p.tab === "in_progress"),
    completed: result.filter((p) => p.tab === "completed"),
  };
}

export async function getProjectOverview(id) {
  const p = await prisma.project.findUnique({
    where: { id },
    include: projectInclude,
  });
  if (!p) {
    const err = new Error("ไม่พบ requirement");
    err.status = 404;
    throw err;
  }
  const pending = await pendingTrainingMap([p]);
  const base = mapProject(p, pending, new Date());
  const extras = await buildDetailExtras(p, pending);
  return { ...base, ...extras };
}

// ============================================================
// หน้ารายละเอียด — ข้อมูลเพิ่มสำหรับแท็บใต้ตารางวันทำงาน
//   team      ทีม & ตำแหน่ง (ทุกคนที่ถูกเสนอ/อนุมัติ ต่อตำแหน่ง)
//   trips     Check In (จัดกลุ่มตามวัน MOB = 1 เที่ยว)
//   restDays  Rest Day (พักมากี่วันก่อนลงงานนี้ นับจาก D-MOB งานก่อนหน้า)
//   reviews   ผู้ประเมิน (Post-Project Review)
// ============================================================

// วันพักขั้นต่ำ = ครึ่งหนึ่งของจำนวนวันที่อยู่บนงานรอบก่อน (ปัดขึ้น) — ปรับอัตราได้ที่นี่
const REST_RATIO = 0.5;
const DAY_MS = 86400000;
const dayDiff = (a, b) =>
  Math.round(
    (new Date(new Date(a).toDateString()) - new Date(new Date(b).toDateString())) / DAY_MS,
  );

const TASK_DETAIL_SELECT = {
  taskType: true,
  status: true,
  resultStatus: true,
  measuredValue: true,
  vesselName: true,
  departureDate: true,
  transportType: true,
  pickupLocation: true,
  hotelName: true,
  checkInDate: true,
  checkOutDate: true,
  checkedAt: true,
};

async function buildDetailExtras(p, pendingTrainingByEmp) {
  const now = new Date();

  // ── ทีม & ตำแหน่ง ──
  const team = p.requests.map((req) => ({
    requestId: req.id,
    position: req.position?.name ?? null,
    quantity: req.quantity,
    members: (req.rounds[0]?.candidates ?? []).map((c) => {
      const m = c.employee?.medicalChecks?.[0];
      const assigned = p.assignments.find((a) => a.employeeId === c.employeeId);
      return {
        employeeId: c.employeeId,
        fullName: c.employee?.fullName,
        empCode: c.employee?.empCode,
        empId: c.employee?.empId,
        employeePosition: c.employee?.position?.name ?? null,
        status: c.status, // proposed | approved | rejected
        workerConfirmStatus: c.workerConfirmStatus,
        medicalExpiry: m?.expiryDate ?? null,
        medicalOk:
          !!m?.expiryDate &&
          new Date(m.expiryDate) >=
            (p.startDate && new Date(p.startDate) > now ? new Date(p.startDate) : now) &&
          m.status !== "failed",
        pendingTraining: pendingTrainingByEmp.get(c.employeeId) || 0,
        mobDate: assigned?.mobDate ?? null,
        demobDate: assigned?.demobDate ?? null,
      };
    }),
  }));

  // ── Check In: งานเตรียมเดินทางของแต่ละคน (จาก checklist ใน Worker Schedule) ──
  const bookings = await prisma.booking.findMany({
    where: { request: { projectId: p.id }, status: { not: "cancelled" } },
    select: {
      employeeId: true,
      mobilizationTasks: { select: TASK_DETAIL_SELECT },
    },
  });
  const tasksByEmp = new Map();
  for (const b of bookings) {
    tasksByEmp.set(b.employeeId, [...(tasksByEmp.get(b.employeeId) || []), ...b.mobilizationTasks]);
  }
  const pick = (tasks, type) => tasks.find((t) => t.taskType === type) || null;

  const tripMap = new Map();
  for (const a of p.assignments) {
    const key = a.mobDate ? new Date(a.mobDate).toDateString() : "none";
    if (!tripMap.has(key)) tripMap.set(key, { mobDate: a.mobDate, travelers: [] });
    const tasks = tasksByEmp.get(a.employeeId) || [];
    const vessel = pick(tasks, "vessel_booking");
    const transport = pick(tasks, "transport_booking");
    const hotel = pick(tasks, "hotel_booking");
    const checks = tasks
      .filter((t) => TASK_STAGE[t.taskType] === "hangar")
      .map((t) => ({
        taskType: t.taskType,
        status: t.status,
        resultStatus: t.resultStatus,
        measuredValue: t.measuredValue,
      }));
    tripMap.get(key).travelers.push({
      employeeId: a.employeeId,
      fullName: a.employee?.fullName,
      empId: a.employee?.empId,
      empCode: a.employee?.empCode,
      position: a.employee?.position?.name ?? null,
      fromLocation: a.fromLocation ?? null,
      platform: a.platform ?? null,
      vesselName: vessel?.vesselName ?? null,
      departureDate: vessel?.departureDate ?? null,
      vesselDone: vessel ? ["completed", "not_required"].includes(vessel.status) : null,
      transportType: transport?.transportType ?? null,
      pickupLocation: transport?.pickupLocation ?? null,
      hotelName: hotel?.hotelName ?? null,
      checks,
    });
  }
  const trips = [...tripMap.values()]
    .sort((x, y) => new Date(x.mobDate || 0) - new Date(y.mobDate || 0))
    .map((t, i) => {
      const vessels = [...new Set(t.travelers.map((x) => x.vesselName).filter(Boolean))];
      const platforms = [...new Set(t.travelers.map((x) => x.platform).filter(Boolean))];
      const froms = [...new Set(t.travelers.map((x) => x.fromLocation).filter(Boolean))];
      const allChecked = t.travelers.every(
        (x) => x.checks.length > 0 && x.checks.every((c) => ["completed", "not_required"].includes(c.status)),
      );
      const failed = t.travelers.filter((x) => x.checks.some((c) => c.resultStatus === "fail")).length;
      return {
        no: i + 1,
        mobDate: t.mobDate,
        vessels,
        route: `${froms.join(", ") || p.location || "—"} → ${platforms.join(", ") || "—"}`,
        travelers: t.travelers,
        allChecked,
        failed,
      };
    });

  // ── Rest Day: พักมากี่วันก่อนลงงานนี้ ──
  const empIds = [...new Set(p.assignments.map((a) => a.employeeId))];
  const history = empIds.length
    ? await prisma.assignment.findMany({
        where: { employeeId: { in: empIds }, demobDate: { not: null } },
        select: {
          id: true,
          employeeId: true,
          mobDate: true,
          demobDate: true,
          projectLabel: true,
          project: { select: { name: true } },
        },
      })
    : [];
  const restDays = p.assignments.map((a) => {
    const prev = a.mobDate
      ? history
          .filter(
            (h) =>
              h.employeeId === a.employeeId &&
              h.id !== a.id &&
              new Date(h.demobDate) <= new Date(a.mobDate),
          )
          .sort((x, y) => new Date(y.demobDate) - new Date(x.demobDate))[0]
      : null;
    const rest = prev ? dayDiff(a.mobDate, prev.demobDate) : null;
    const prevHitch = prev?.mobDate ? dayDiff(prev.demobDate, prev.mobDate) : null;
    const required = prevHitch ? Math.ceil(prevHitch * REST_RATIO) : null;
    return {
      employeeId: a.employeeId,
      fullName: a.employee?.fullName,
      empId: a.employee?.empId,
      empCode: a.employee?.empCode,
      mobDate: a.mobDate,
      prevDemobDate: prev?.demobDate ?? null,
      prevProject: prev ? prev.project?.name || prev.projectLabel || null : null,
      prevHitchDays: prevHitch,
      restDays: rest,
      requiredRest: required,
      enough: rest === null || required === null ? null : rest >= required,
    };
  });

  // ── ผู้ประเมิน ──
  const reviewRows = await prisma.performanceReview.findMany({
    where: { projectId: p.id },
    select: {
      employeeId: true,
      rating: true,
      rehire: true,
      updatedAt: true,
      reviewedBy: { select: { name: true, titlePrefix: true } },
    },
  });
  const reviewByEmp = new Map(reviewRows.map((r) => [r.employeeId, r]));
  const reviews = p.assignments.map((a) => {
    const r = reviewByEmp.get(a.employeeId);
    return {
      employeeId: a.employeeId,
      fullName: a.employee?.fullName,
      empId: a.employee?.empId,
      empCode: a.employee?.empCode,
      position: a.employee?.position?.name ?? null,
      reviewed: !!r,
      rating: r?.rating ?? null,
      rehire: r?.rehire ?? null,
      reviewedAt: r?.updatedAt ?? null,
      reviewer: r?.reviewedBy
        ? `${r.reviewedBy.titlePrefix ?? ""}${r.reviewedBy.name ?? ""}`
        : null,
    };
  });

  return { team, trips, restDays, reviews, restRatio: REST_RATIO };
}

// ============================================================
// ประวัติของ requirement — ใครทำอะไร เมื่อไร (จาก Audit Log)
// จับคู่ด้วย id ของ requirement / ตำแหน่ง / booking / candidate / คำขอ PE / assignment
// ที่อยู่ใน resourceId, path หรือข้อมูลที่ส่งมา (details)
// ============================================================
const HISTORY_MODULES = [
  "projects",
  "allocation",
  "pe_approvals",
  "mobilization",
  "review",
  "project_messages",
  "training_requests",
  "medical_requests",
];

// ข้อความสำรอง กรณี log ไม่มี summary
const ACTION_TH = {
  CREATE: "เพิ่ม",
  UPDATE: "แก้ไข",
  DELETE: "ลบ",
  APPROVE: "อนุมัติ",
  REJECT: "ไม่อนุมัติ",
  DECISION: "ตัดสินใจ",
  REVOKE: "ยกเลิกการอนุมัติ",
  UPLOAD: "อัปโหลด",
};
const MODULE_TH = {
  projects: "Requirement",
  allocation: "จัดรายชื่อ (Assign Names)",
  pe_approvals: "อนุมัติรายชื่อ (PE)",
  mobilization: "Worker Schedule",
  review: "ประเมินผลงาน",
  project_messages: "ข้อความในโปรเจกต์",
  training_requests: "คำขออบรม",
  medical_requests: "คำขอตรวจสุขภาพ",
};

// ข้อความที่ผู้ใช้อ่านเข้าใจ (แทน "เพิ่ม allocation" / "ตัดสินผล pe_approvals #…")
const HISTORY_TEXT = {
  allocation: {
    CREATE: "เสนอชื่อเข้าตำแหน่ง (Proposed)",
    DELETE: "เอาชื่อออกจากรายชื่อที่จัด",
    APPROVE: "Approve รายชื่อ",
    REVOKE: "ยกเลิก Approve (กลับเป็น Proposed)",
    REJECT: "ไม่อนุมัติรายชื่อ",
    UPDATE: "แก้ไขรายชื่อที่จัด",
  },
  pe_approvals: {
    CREATE: "ส่งขออนุมัติ PE (% Match ไม่ครบ 100%)",
    DECISION: "PE ตัดสินคำขอ",
    APPROVE: "PE อนุมัติ",
    REJECT: "PE ไม่อนุมัติ",
    DELETE: "ยกเลิกคำขออนุมัติ PE",
  },
  projects: {
    CREATE: "สร้าง requirement",
    UPDATE: "แก้ไข requirement / ตำแหน่ง",
    DELETE: "ลบ requirement / ตำแหน่ง",
  },
  project_messages: { CREATE: "ส่งข้อความในโปรเจกต์", UPLOAD: "แนบไฟล์ในโปรเจกต์" },
  mobilization: {
    CREATE: "เพิ่มใน Worker Schedule",
    UPDATE: "อัปเดต Worker Schedule (checklist / วัน MOB–D-MOB)",
    DELETE: "ลบจาก Worker Schedule",
  },
  review: { CREATE: "บันทึกผลประเมิน", UPDATE: "แก้ผลประเมิน" },
  training_requests: { CREATE: "ส่งคำขออบรม", UPDATE: "อัปเดตคำขออบรม", DECISION: "HR ตอบคำขออบรม" },
  medical_requests: { CREATE: "ส่งคำขอตรวจสุขภาพ", UPDATE: "อัปเดตคำขอตรวจสุขภาพ", DECISION: "HR ตอบคำขอตรวจสุขภาพ" },
};
function historyText(log, peStatus) {
  const t = HISTORY_TEXT[log.module]?.[log.action];
  if (!t) return null;
  if (log.module === "pe_approvals" && log.action === "DECISION") {
    if (peStatus === "approved") return "PE อนุมัติ (% Match ไม่ครบ)";
    if (peStatus === "rejected") return "PE ไม่อนุมัติ";
  }
  return t;
}

const historyCategory = (log) => {
  if (["APPROVE", "REJECT", "DECISION", "REVOKE"].includes(log.action)) return "status";
  if (["allocation", "pe_approvals"].includes(log.module)) return "team";
  return "docs";
};

export async function getProjectHistory(id) {
  const p = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      requests: {
        select: {
          id: true,
          bookings: { select: { id: true, employeeId: true, employee: { select: { fullName: true } } } },
          matchExceptions: {
            select: { id: true, status: true, employeeId: true, employee: { select: { fullName: true } } },
          },
          rounds: {
            select: {
              id: true,
              candidates: {
                select: { id: true, employeeId: true, employee: { select: { fullName: true } } },
              },
            },
          },
        },
      },
      assignments: { select: { id: true, employeeId: true, employee: { select: { fullName: true } } } },
    },
  });
  if (!p) {
    const err = new Error("ไม่พบ requirement");
    err.status = 404;
    throw err;
  }

  const ids = new Set([p.id]);
  for (const r of p.requests) {
    ids.add(r.id);
    r.bookings.forEach((b) => ids.add(b.id));
    r.matchExceptions.forEach((m) => ids.add(m.id));
    r.rounds.forEach((rd) => {
      ids.add(rd.id);
      rd.candidates.forEach((c) => ids.add(c.id));
    });
  }
  p.assignments.forEach((a) => ids.add(a.id));
  const idList = [...ids];

  // id → ชื่อพนักงาน (candidate / คำขอ PE / booking / assignment / employee) — ใช้บอกว่าทำกับใคร
  const nameById = new Map();
  const peStatusById = new Map();
  const addName = (x) => {
    const n = x.employee?.fullName;
    if (!n) return;
    nameById.set(x.id, n);
    if (x.employeeId) nameById.set(x.employeeId, n);
  };
  for (const r of p.requests) {
    r.bookings.forEach(addName);
    r.matchExceptions.forEach((m) => {
      addName(m);
      peStatusById.set(m.id, m.status);
    });
    r.rounds.forEach((rd) => rd.candidates.forEach(addName));
  }
  p.assignments.forEach(addName);

  const logs = await prisma.auditLog.findMany({
    where: {
      success: true,
      createdAt: { gte: new Date(new Date(p.createdAt).getTime() - 60000) },
      module: { in: HISTORY_MODULES },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      createdAt: true,
      actorName: true,
      actorRole: true,
      action: true,
      module: true,
      resourceId: true,
      summary: true,
      method: true,
      path: true,
      details: true,
    },
  });

  const related = logs.filter((l) => {
    if (l.resourceId && ids.has(l.resourceId)) return true;
    if (l.path && idList.some((x) => l.path.includes(x))) return true;
    if (l.details) {
      const raw = JSON.stringify(l.details);
      return idList.some((x) => raw.includes(x));
    }
    return false;
  });

  const items = related.slice(0, 300).map((l) => {
    const hay = `${l.resourceId || ""} ${l.path || ""} ${l.details ? JSON.stringify(l.details) : ""}`;
    const names = [...new Set([...nameById.keys()].filter((k) => hay.includes(k)).map((k) => nameById.get(k)))];
    const peId = [...peStatusById.keys()].find((k) => hay.includes(k));
    const friendly = historyText(l, peId ? peStatusById.get(peId) : null);
    const who = names.length ? ` · ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3}` : ""}` : "";
    return {
      id: l.id,
      at: l.createdAt,
      actor: l.actorName,
      role: l.actorRole,
      action: l.action,
      module: l.module,
      summary: friendly ? friendly + who : (l.summary || `${ACTION_TH[l.action] || l.action} · ${MODULE_TH[l.module] || l.module}`),
      raw: l.summary || `${l.method || ""} ${l.path || ""}`.trim(), // ข้อความเดิมจาก Audit Log (tooltip)
      changes: l.details?.changes ? Object.keys(l.details.changes).length : 0,
      category: historyCategory(l),
    };
  });

  // requirement ที่สร้างก่อนเปิด Audit Log — ยังมีจุดเริ่มต้นให้เห็น
  if (!items.some((i) => i.module === "projects" && i.action === "CREATE")) {
    items.push({
      id: `created-${p.id}`,
      at: p.createdAt,
      actor: null,
      role: null,
      action: "CREATE",
      module: "projects",
      summary: `สร้าง requirement "${p.name}"`,
      changes: 0,
      category: "docs",
    });
  }

  return items.sort((a, b) => new Date(b.at) - new Date(a.at));
}

// ============================================================
// Manpower Requirements — รายการ position request ทุกตัว (1 แถว = 1 ตำแหน่งใน 1 requirement)
// ใช้ข้อมูลชุดเดียวกับหน้า ProjectDetail (ตาราง ManpowerRequest) → เพิ่ม/แก้ที่ไหนก็เห็นทั้งสองหน้า
//   Requested by = คนที่เพิ่มตำแหน่งนี้ (ManpowerRequest.requestedBy)
//   Filled by    = คนที่จัดรายชื่อเข้าตำแหน่งนี้ล่าสุด (Audit Log ของ Assign Names)
// ============================================================
export async function getRequirements() {
  const requests = await prisma.manpowerRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      position: { select: { id: true, name: true } },
      requestedBy: { select: { name: true, titlePrefix: true } },
      matchExceptions: { where: { status: "pending" }, select: { id: true } },
      bookings: { where: { status: { not: "cancelled" } }, select: { id: true } },
      rounds: {
        orderBy: { round: "desc" },
        take: 1,
        include: {
          candidates: {
            select: {
              status: true,
              // ชื่อพนักงานที่จัดเข้าตำแหน่ง — ให้ช่องค้นหาหน้า Requirements หาจากชื่อได้
              employee: {
                select: { empId: true, fullName: true, fullNameEN: true, fullNameTH: true },
              },
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          location: true,
          isOffshore: true,
          startDate: true,
          endDate: true,
          status: true,
          contract: { select: { name: true, client: { select: { name: true } } } },
          masterProjectRecord: { select: { projectCode: true, jobTitle: true } },
        },
      },
    },
  });

  // ── Filled by: log การเพิ่มรายชื่อ (POST /api/allocation/shortlist) ล่าสุดของแต่ละตำแหน่ง ──
  const ids = new Set(requests.map((r) => r.id));
  const filledBy = new Map();
  if (ids.size > 0) {
    const logs = await prisma.auditLog.findMany({
      where: { module: "allocation", success: true, method: "POST" },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { createdAt: true, actorName: true, path: true, details: true },
    });
    for (const l of logs) {
      if (!l.path?.includes("shortlist") || !l.details) continue;
      const raw = JSON.stringify(l.details);
      const m = raw.match(/"requestId":"([0-9a-f-]{36})"/);
      const reqId = m && ids.has(m[1]) ? m[1] : null;
      if (reqId && !filledBy.has(reqId))
        filledBy.set(reqId, { name: l.actorName || null, at: l.createdAt });
    }
  }

  return requests.map((r) => {
    const cands = (r.rounds[0]?.candidates ?? []).filter((c) => c.status !== "rejected");
    const p = r.project;
    return {
      id: r.id,
      projectId: p?.id,
      position: r.position?.name ?? null,
      positionId: r.position?.id ?? null,
      quantity: r.quantity,
      assigned: cands.length,
      approved: cands.filter((c) => c.status === "approved").length,
      booked: r.bookings.length, // = คอลัมน์ ASSIGNED ในหน้า ProjectDetail
      pendingPe: r.matchExceptions.length,
      status: r.status,
      startDate: r.startDate ?? p?.startDate ?? null,
      endDate: r.endDate ?? p?.endDate ?? null,
      location: p?.location ?? null,
      isOffshore: r.isOffshore || p?.isOffshore || false,
      projectName: p?.name ?? null,
      projectCode: p?.masterProjectRecord?.projectCode ?? null,
      jobTitle: p?.masterProjectRecord?.jobTitle ?? p?.name ?? null,
      projectStatus: p?.status ?? null,
      client: p?.contract?.client?.name ?? null,
      contract: p?.contract?.name ?? null,
      requestedBy: r.requestedBy
        ? `${r.requestedBy.titlePrefix ?? ""}${r.requestedBy.name ?? ""}`
        : null,
      requestedAt: r.createdAt,
      filledBy: filledBy.get(r.id) || null,
      projectStartDate: p?.startDate ?? null,
      workers: cands
        .filter((c) => c.employee)
        .map((c) => ({
          empId: c.employee.empId ?? null,
          name: c.employee.fullNameEN || c.employee.fullName,
          nameTH: c.employee.fullNameTH ?? null,
          status: c.status,
        })),
    };
  });
}
