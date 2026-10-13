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
      empCode: true,
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
          fullName: e.fullName,
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
          fullName: e.fullName,
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

  const { employees, valid, expiring, expired, byType, alerts } =
    await computeComplianceData();

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
    .sort(
      (a, b) =>
        b.expired - a.expired || b.expiring - a.expiring || b.total - a.total,
    )
    .slice(0, 10);

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
  };
}

// ════════════════════════════════════════════════════════════════
// GET — Alerts รายชื่อเต็ม ต่อ training/cert type เดียว (ไม่ cap)
// ใช้เปิด modal ในหน้า Dashboard เพื่อดูรายชื่อครบทุกคน
// ════════════════════════════════════════════════════════════════
export async function getAlertsByTraining(trainingName) {
  const { alerts } = await computeComplianceData();
  return alerts.filter((a) => a.training === trainingName);
}
