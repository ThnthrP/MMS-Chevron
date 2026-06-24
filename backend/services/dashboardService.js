import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════
// GET — Admin Dashboard
// ใช้ logic เดียวกับ complianceService (training + medical, เกณฑ์เดียวกัน)
//   expired: days < 0 · critical: <30 · warning: 30–60 · valid: >60 หรือไม่มี expiry
// เพื่อให้ตัวเลขตรงกับหน้า Compliance Center
// ════════════════════════════════════════════════════════════════
export async function getDashboard() {
  const employees = await prisma.employee.findMany({
    where: { status: "active" }, // ← ตรงกับ compliance (active เท่านั้น)
    select: {
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

  // ── worker breakdowns ──
  const mobilization = { pending: 0, ready: 0, on_site: 0 };
  const availability = { available: 0, unavailable: 0 };
  for (const e of employees) {
    if (mobilization[e.mobilizationStatus] !== undefined)
      mobilization[e.mobilizationStatus]++;
    if (availability[e.availabilityStatus] !== undefined)
      availability[e.availabilityStatus]++;
  }

  const today = new Date();
  const daysLeft = (d) =>
    Math.ceil((new Date(d) - today) / (1000 * 60 * 60 * 24));

  // bucket รวม (training + medical) — เกณฑ์เดียวกับ compliance
  let valid = 0,
    expiring = 0, // = critical + warning (<60 วัน, ยังไม่หมด)
    expired = 0;

  // per-type (สำหรับ stacked bar) — เฉพาะ training (มี type ชัด)
  const byType = {};
  // alert list (training + medical ที่ expired/expiring)
  const alerts = [];

  const bucketOf = (expiryDate) => {
    if (!expiryDate) return "valid"; // ไม่มีวันหมดอายุ = valid
    const d = daysLeft(expiryDate);
    if (isNaN(d)) return "valid";
    if (d < 0) return "expired";
    if (d <= 60) return "expiring"; // <30 critical + 30-60 warning รวมเป็น expiring
    return "valid";
  };

  for (const e of employees) {
    // trainings
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

    // medical — รวมใน KPI + alert + by-type chart (D: ให้ medical โผล่ในกราฟด้วย)
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

  // by-type (D):
  //   1) ซ่อน type ที่ valid ล้วน (ไม่มี expired/expiring เลย) — เช่น procedure ไม่มี expiry
  //   2) เรียงจาก expired มากสุดก่อน → expiring → total
  const certByType = Object.values(byType)
    .map((x) => ({
      ...x,
      alerts: x.expired + x.expiring,
      total: x.valid + x.expiring + x.expired,
    }))
    .filter((x) => x.alerts > 0) // ตัด type ที่ valid ล้วนทิ้ง
    .sort(
      (a, b) =>
        b.expired - a.expired || b.expiring - a.expiring || b.total - a.total,
    )
    .slice(0, 10);

  // alerts: หมดอายุ/ใกล้สุดก่อน
  alerts.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  return {
    generatedAt: new Date().toISOString(),
    totalWorkers: employees.length,
    counts: {
      ready: mobilization.ready,
      onSite: mobilization.on_site,
      certAlerts: expiring + expired, // ← ตรงกับ compliance: critical+warning+expired
    },
    mobilization,
    availability,
    certCompliance: { valid, expiring, expired },
    certByType,
    alerts: alerts.slice(0, 15),
  };
}
