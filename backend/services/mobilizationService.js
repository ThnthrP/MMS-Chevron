import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMOB_DAYS = 28; // rotation 4 สัปดาห์
const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase();

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// status อิงวันที่ (ให้ตรงกับ roster import): planned / active / completed
function statusByDate(mob, demob) {
  const now = Date.now();
  if (new Date(mob).getTime() > now) return "planned";
  if (demob && new Date(demob).getTime() >= now) return "active";
  return "completed";
}

// ════════════════════════════════════════════════════════════════
// GET — approved workers ของ project (ต่อจาก Allocation) + project info
// กรองเฉพาะ status = "approved" + medical + assignment เดิม (ถ้าเคย deploy)
// ════════════════════════════════════════════════════════════════
export async function getMobilizationList(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { contract: { include: { client: true } } },
  });
  if (!project) return null;

  const requests = await prisma.manpowerRequest.findMany({
    where: { projectId },
    include: {
      position: true,
      rounds: {
        orderBy: { round: "desc" },
        take: 1,
        include: {
          candidates: {
            where: { status: "approved" },
            include: {
              employee: {
                include: {
                  position: true,
                  medicalChecks: {
                    select: { checkType: true, expiryDate: true, status: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // assignment เดิมของ project นี้ (คนที่ deploy ไปแล้ว)
  const assignments = await prisma.assignment.findMany({
    where: { projectId },
  });
  const asgByEmp = new Map(assignments.map((a) => [a.employeeId, a]));

  const seen = new Set();
  const workers = [];

  for (const req of requests) {
    const cands = req.rounds[0]?.candidates ?? [];
    for (const c of cands) {
      if (seen.has(c.employeeId)) continue; // กันซ้ำ (คน approved หลาย request)
      seen.add(c.employeeId);

      const e = c.employee;
      const medical =
        e.medicalChecks?.find((m) => norm(m.checkType) === "medicalcheckup") ||
        null;
      const asg = asgByEmp.get(c.employeeId) || null;

      workers.push({
        candidateId: c.id,
        employeeId: e.id,
        empCode: e.empCode,
        fullName: e.fullName,
        position: e.position?.name || req.position?.name || null,
        birthDate: e.birthDate,
        requestId: req.id,
        medicalExpiry: medical?.expiryDate ?? null,
        medicalStatus: medical?.status ?? null,
        assignment: asg
          ? {
              mobDate: asg.mobDate,
              demobDate: asg.demobDate,
              platform: asg.platform,
              status: asg.status,
              createdAt: asg.createdAt, // ← "Deployed on"
              updatedAt: asg.updatedAt,
            }
          : null,
      });
    }
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      location: project.location || null,
      startDate: project.startDate, // default MOB ฝั่ง frontend
      client: project.contract?.client?.name || null,
    },
    demobDays: DEMOB_DAYS,
    workers,
  };
}

// ════════════════════════════════════════════════════════════════
// POST — Deploy to Site (Step 11) → สร้าง Assignment
// deployments: [{ employeeId, mobDate, platform }]
//   D-MOB = mobDate + 28 (คำนวณ backend)
//   idempotent: ลบ assignment เดิม (bookingId=null) ของ employee+project ก่อน
// ════════════════════════════════════════════════════════════════
export async function deployToSite({ projectId, deployments }) {
  const created = [];

  for (const d of deployments) {
    if (!d.employeeId || !d.mobDate || !d.platform) continue;

    const mob = new Date(d.mobDate);
    const demob = addDays(mob, DEMOB_DAYS);
    const status = statusByDate(mob, demob);

    await prisma.assignment.deleteMany({
      where: { employeeId: d.employeeId, projectId, bookingId: null },
    });

    const asg = await prisma.assignment.create({
      data: {
        employeeId: d.employeeId,
        projectId,
        mobDate: mob,
        demobDate: demob,
        platform: d.platform,
        status,
      },
    });
    created.push(asg);
  }

  return { deployed: created.length, assignments: created };
}

// ════════════════════════════════════════════════════════════════
// POST — Undeploy → ลบ Assignment (เฉพาะ roster bookingId=null)
//   ไม่แตะ assignment จริงจาก booking flow (bookingId != null)
// ════════════════════════════════════════════════════════════════
export async function undeployWorker({ projectId, employeeId }) {
  if (!projectId || !employeeId) return { count: 0 };
  const result = await prisma.assignment.deleteMany({
    where: { employeeId, projectId, bookingId: null },
  });
  return { count: result.count };
}
