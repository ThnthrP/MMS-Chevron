import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════
// Shared helper — ดึง employees + คำนวณ bucket/certByType/alerts (ไม่ cap)
// ใช้ร่วมกันทั้ง getDashboard() และ getAlertsByTraining()
// ════════════════════════════════════════════════════════════════
async function computeComplianceData() {
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: {
      id: true,
      availabilityStatus: true,
      mobilizationStatus: true,
      fullName: true,
      fullNameTH: true,
      empCode: true,
      empId: true,
      position: { select: { name: true } },
      trainings: {
        where: { isLatest: true },
        select: {
          expiryDate: true,
          rawTrainingName: true,
          globalTraining: { select: { name: true } },
        },
      },
      medicalChecks: {
        select: { expiryDate: true, checkType: true },
      },
    },
  });

  const today = new Date();
  const daysLeft = (d) =>
    Math.ceil((new Date(d) - today) / (1000 * 60 * 60 * 24));

  let valid = 0,
    expiring = 0,
    expired = 0;

  const byType = {};
  const alerts = []; // ← ไม่ cap ที่นี่

  const bucketOf = (expiryDate) => {
    if (!expiryDate) return "valid";
    const d = daysLeft(expiryDate);
    if (isNaN(d)) return "valid";
    if (d < 0) return "expired";
    if (d <= 60) return "expiring";
    return "valid";
  };

  for (const e of employees) {
    for (const t of e.trainings) {
      const name = t.globalTraining?.name || t.rawTrainingName || "Unknown";
      if (!byType[name])
        byType[name] = { name, valid: 0, expiring: 0, expired: 0 };
      const b = bucketOf(t.expiryDate);
      byType[name][b]++;
      if (b === "valid") valid++;
      else if (b === "expiring") expiring++;
      else expired++;

      if (b === "expired" || b === "expiring") {
        alerts.push({
          employeeId: e.id,
          fullName: e.fullName,
          fullNameTH: e.fullNameTH || null,
          empId: e.empId || null,
          empCode: e.empCode,
          position: e.position?.name || null,
          training: name,
          type: "Training",
          expiryDate: t.expiryDate,
          bucket: b,
          daysLeft: daysLeft(t.expiryDate),
        });
      }
    }

    for (const m of e.medicalChecks) {
      const name = m.checkType || "Medical";
      if (!byType[name])
        byType[name] = { name, valid: 0, expiring: 0, expired: 0 };
      const b = bucketOf(m.expiryDate);
      byType[name][b]++;
      if (b === "valid") valid++;
      else if (b === "expiring") expiring++;
      else expired++;

      if (b === "expired" || b === "expiring") {
        alerts.push({
          employeeId: e.id,
          fullName: e.fullName,
          fullNameTH: e.fullNameTH || null,
          empId: e.empId || null,
          empCode: e.empCode,
          position: e.position?.name || null,
          training: name,
          type: "Medical",
          expiryDate: m.expiryDate,
          bucket: b,
          daysLeft: daysLeft(m.expiryDate),
        });
      }
    }
  }

  alerts.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  return { employees, valid, expiring, expired, byType, alerts };
}

// ════════════════════════════════════════════════════════════════
// GET — Admin Dashboard
// ════════════════════════════════════════════════════════════════
export async function getDashboard() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const onSiteAssignments = await prisma.assignment.findMany({
    where: {
      mobDate: { lte: todayStart },
      OR: [{ demobDate: null }, { demobDate: { gte: todayStart } }],
    },
    select: { employeeId: true },
    distinct: ["employeeId"],
  });
  const onSiteEmployeeIds = new Set(onSiteAssignments.map((a) => a.employeeId));
  const onSiteCount = onSiteEmployeeIds.size;

  const [{ employees, valid, expiring, expired, byType, alerts }, pendingBookings, demobSoon] =
    await Promise.all([
      computeComplianceData(),
      getPendingBookings().catch((e) => (console.error(e), null)),
      getDemobSoon(todayStart).catch((e) => (console.error(e), null)),
    ]);

  const mobilization = { pending: 0, ready: 0, on_site: onSiteCount };
  const availability = { available: 0, unavailable: 0 };
  for (const e of employees) {
    if (!onSiteEmployeeIds.has(e.id)) {
      if (e.mobilizationStatus === "pending") mobilization.pending++;
      else if (e.mobilizationStatus === "ready") mobilization.ready++;
    }
    if (availability[e.availabilityStatus] !== undefined)
      availability[e.availabilityStatus]++;
  }

  const certByType = Object.values(byType)
    .map((x) => ({
      ...x,
      alerts: x.expired + x.expiring,
      total: x.valid + x.expiring + x.expired,
    }))
    .filter((x) => x.alerts > 0)
    // ส่งครบทุกประเภท (เดิม cap 10 → ตาราง alert บางแถวนับไม่ครบ) — กราฟตัดเองฝั่งหน้าเว็บ
    .sort(
      (a, b) =>
        b.expired - a.expired || b.expiring - a.expiring || b.total - a.total,
    );

  return {
    generatedAt: new Date().toISOString(),
    totalWorkers: employees.length,
    counts: {
      ready: mobilization.ready,
      onSite: onSiteCount,
      certAlerts: expiring + expired,
    },
    mobilization,
    availability,
    certCompliance: { valid, expiring, expired },
    certByType,
    alerts: alerts.slice(0, 15),
    pendingBookings, // { training: {items, batches}, medical: {items, batches} } | null
    demobSoon, // [{ employeeId, fullName, ..., demobDate, project }] | null
  };
}

// ════════════════════════════════════════════════════════════════
// Booking ที่รอ HR ยืนยัน (Training / Medical) — นับรายคน (item) + จำนวนคำขอ (batch)
// ════════════════════════════════════════════════════════════════
async function getPendingBookings() {
  const where = { status: "pending", batch: { status: "pending" } };
  const [tItems, mItems] = await Promise.all([
    prisma.trainingRequestItem.findMany({ where, select: { batchId: true } }),
    prisma.medicalRequestItem.findMany({ where, select: { batchId: true } }),
  ]);
  const summary = (items) => ({
    items: items.length,
    batches: new Set(items.map((i) => i.batchId)).size,
  });
  return { training: summary(tItems), medical: summary(mItems) };
}

// ════════════════════════════════════════════════════════════════
// พนักงานที่จะ D-MOB ภายใน 7 วัน (นับจากวันนี้) — เตรียมคนผลัดต่อ
// ════════════════════════════════════════════════════════════════
const DEMOB_SOON_DAYS = 7;

async function getDemobSoon(todayStart) {
  const until = new Date(todayStart);
  until.setDate(until.getDate() + DEMOB_SOON_DAYS);
  until.setHours(23, 59, 59, 999);

  const rows = await prisma.assignment.findMany({
    where: { demobDate: { gte: todayStart, lte: until } },
    orderBy: { demobDate: "asc" },
    take: 200,
    select: {
      employeeId: true,
      mobDate: true,
      demobDate: true,
      platform: true,
      projectLabel: true,
      position: { select: { name: true } },
      employee: {
        select: {
          fullName: true,
          fullNameTH: true,
          empId: true,
          position: { select: { name: true } },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          masterProjectRecord: { select: { projectCode: true } },
        },
      },
    },
  });

  return rows.map((a) => ({
    employeeId: a.employeeId,
    fullName: a.employee?.fullName ?? null,
    fullNameTH: a.employee?.fullNameTH ?? null,
    empId: a.employee?.empId ?? null,
    position: a.position?.name ?? a.employee?.position?.name ?? null,
    mobDate: a.mobDate,
    demobDate: a.demobDate,
    platform: a.platform,
    projectId: a.project?.id ?? null,
    projectName: a.project?.name ?? a.projectLabel ?? null,
    projectCode: a.project?.masterProjectRecord?.projectCode ?? null,
  }));
}

// ════════════════════════════════════════════════════════════════
// GET — Alerts รายชื่อเต็ม ต่อ training/cert type เดียว (ไม่ cap)
// ใช้เปิด modal ในหน้า Dashboard เพื่อดูรายชื่อครบทุกคน
// ════════════════════════════════════════════════════════════════
export async function getAlertsByTraining(trainingName) {
  const { alerts } = await computeComplianceData();
  return alerts.filter((a) => a.training === trainingName);
}
