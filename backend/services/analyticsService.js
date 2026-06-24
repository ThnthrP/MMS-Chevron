import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SIXTY_DAYS = 60 * 86400000;

// ════════════════════════════════════════════════════════════════
// GET — aggregate ทั้งหมดสำหรับ Analytics & Reports (คืน JSON ก้อนเดียว)
// ════════════════════════════════════════════════════════════════
export async function getAnalytics() {
  const [employees, projects, trainings] = await Promise.all([
    prisma.employee.findMany({
      select: {
        id: true,
        division: true,
        status: true,
        availabilityStatus: true,
        mobilizationStatus: true,
        position: { select: { name: true } },
      },
    }),
    prisma.project.findMany({ select: { status: true } }),
    prisma.employeeTraining.findMany({
      where: { isLatest: true },
      select: { expiryDate: true },
    }),
  ]);

  // ── Headcount by Division (department) ──
  const divMap = {};
  for (const e of employees) {
    const key = e.division || "Unspecified";
    divMap[key] = (divMap[key] || 0) + 1;
  }
  const headcountByDivision = Object.entries(divMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // ── Top Positions / Trades ──
  const posMap = {};
  for (const e of employees) {
    const key = e.position?.name || "Unassigned";
    posMap[key] = (posMap[key] || 0) + 1;
  }
  const topPositions = Object.entries(posMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Projects ──
  const projectStats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  // ── Worker status — แยก 2 กลุ่ม ──
  const mobilization = { pending: 0, ready: 0, on_site: 0 };
  const availability = { available: 0, unavailable: 0 };
  const employeeStatus = { active: 0, inactive: 0, resigned: 0, suspended: 0 };
  for (const e of employees) {
    if (mobilization[e.mobilizationStatus] !== undefined)
      mobilization[e.mobilizationStatus]++;
    if (availability[e.availabilityStatus] !== undefined)
      availability[e.availabilityStatus]++;
    if (employeeStatus[e.status] !== undefined) employeeStatus[e.status]++;
  }

  // ── Certification compliance buckets (logic เดียวกับ Compliance) ──
  const now = Date.now();
  let valid = 0,
    expiring = 0,
    expired = 0;
  for (const t of trainings) {
    if (!t.expiryDate) {
      valid++; // ไม่มีวันหมดอายุ = valid
      continue;
    }
    const exp = new Date(t.expiryDate).getTime();
    if (isNaN(exp)) {
      valid++;
      continue;
    }
    const diff = exp - now;
    if (diff < 0) expired++;
    else if (diff <= SIXTY_DAYS) expiring++;
    else valid++;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalWorkers: employees.length,
    headcountByDivision,
    topPositions,
    projects: projectStats,
    workerMobilization: mobilization,
    workerAvailability: availability,
    employeeStatus,
    certCompliance: {
      valid,
      expiring,
      expired,
      total: valid + expiring + expired,
    },
  };
}
