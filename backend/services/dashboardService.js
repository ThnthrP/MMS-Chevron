import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════
// GET — Admin Dashboard
// ใช้ logic เดียวกับ complianceService (training + medical, เกณฑ์เดียวกัน)
//   expired: days < 0 · critical: <30 · warning: 30–60 · valid: >60 หรือไม่มี expiry
// เพื่อให้ตัวเลขตรงกับหน้า Compliance Center
// ════════════════════════════════════════════════════════════════
export async function getDashboard() {
  // ตัดเวลาออก เทียบกันแบบ "วันที่" ล้วนๆ (ไม่สนใจ time-of-day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: {
      id: true, // ← เพิ่ม: ต้องใช้เทียบกับ onSite employeeId set
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

  // ← เพิ่มใหม่: นับจำนวนคนที่อยู่หน้างานจริง ณ ตอนนี้ จากช่วงวันที่ mobDate–demobDate
  //   ของทุก project รวมกัน (ไม่พึ่ง field `status` เพราะไม่ auto-update ตามเวลา —
  //   ดู statusByDate() ใน mobilizationService.js ที่ compute ครั้งเดียวตอน deploy เท่านั้น)
  // นับจำนวนคนที่อยู่หน้างานจริง ณ วันนี้ จาก Assignment table
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

  // ── worker breakdowns ──
  // on_site ใช้ข้อมูลจริงจาก Assignment แทน mobilizationStatus (ไม่ sync กัน)
  // ready/pending ยังอิง mobilizationStatus แต่ตัดคนที่ on-site จริงออกก่อน กันนับซ้ำ
  const mobilization = { pending: 0, ready: 0, on_site: onSiteCount };
  const availability = { available: 0, unavailable: 0 };
  for (const e of employees) {
    if (!onSiteEmployeeIds.has(e.id)) {
      if (e.mobilizationStatus === "pending") mobilization.pending++;
      else if (e.mobilizationStatus === "ready") mobilization.ready++;
      // ถ้า mobilizationStatus === "on_site" แต่ไม่มีใน onSiteEmployeeIds จริง
      // (ข้อมูลเก่าไม่ sync) จะไม่ถูกนับที่ไหนเลย — เป็นพฤติกรรมที่ตั้งใจ
      // เพราะถือว่า Assignment คือ source of truth
    }
    if (availability[e.availabilityStatus] !== undefined)
      availability[e.availabilityStatus]++;
  }

  // ... (ส่วน bucket/certByType/alerts เดิม ไม่ต้องแก้อะไร) ...
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
      onSite: onSiteCount,
      certAlerts: expiring + expired,
    },
    mobilization, // ← ตอนนี้ on_site sync กับ KPI card แล้ว
    availability,
    certCompliance: { valid, expiring, expired },
    certByType,
    alerts: alerts.slice(0, 15),
  };
}
