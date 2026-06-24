import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// อายุเกษียณ (ให้ตรงกับ frontend Allocation.jsx)
const RETIREMENT_AGE = 60;

export async function getProjectsForDropdown() {
  return prisma.project.findMany({
    include: {
      contract: { include: { client: true } },
      requests: { include: { position: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectAllocationDetail(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      contract: { include: { client: true } },
      requests: {
        include: {
          position: true,
          rounds: {
            orderBy: { round: "desc" },
            take: 1,
            include: {
              candidates: {
                include: {
                  employee: { include: { position: true } },
                  decision: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!project) return null;
  return {
    project,
    requests: project.requests.map((req) => ({
      id: req.id,
      position: req.position,
      quantity: req.quantity,
      status: req.status,
      candidates: req.rounds[0]?.candidates ?? [],
    })),
  };
}

// ─── Step 8: Find workers + Eligibility check ───
export async function findWorkers({ positionId, requestId, contractId }) {
  const where = {
    status: "active",
    availabilityStatus: "available",
  };

  if (positionId) {
    where.positionId = positionId;
  }

  // Exclude employees already shortlisted for this request
  if (requestId) {
    where.NOT = {
      candidates: { some: { round: { requestId } } },
    };
  }

  // auto-filter คนที่เกษียณแล้ว (อายุ >= RETIREMENT_AGE) ออกจาก pool
  const retirementCutoff = new Date();
  retirementCutoff.setFullYear(retirementCutoff.getFullYear() - RETIREMENT_AGE);
  where.OR = [{ birthDate: null }, { birthDate: { gt: retirementCutoff } }];

  const employees = await prisma.employee.findMany({
    where,
    include: {
      position: true,
      trainings: {
        where: { isLatest: true },
        include: { globalTraining: true },
      },
      // Assignment ล่าสุด → Day Off + platform
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          mobDate: true,
          demobDate: true,
          platform: true,
          status: true,
        },
      },
      // medical → status + expiry (โชว์ในคอลัมน์ MEDICAL)
      medicalChecks: {
        select: { checkType: true, expiryDate: true, status: true },
      },
    },
    orderBy: [{ mobilizationStatus: "asc" }, { fullName: "asc" }],
  });

  // ── required trainings จาก Training Matrix ──
  let requiredTrainings = [];

  if (positionId && contractId) {
    const requirements = await prisma.positionRequirement.findMany({
      where: { positionId, contractId },
      include: {
        clientTraining: { include: { globalTraining: true } },
      },
    });

    requiredTrainings = requirements.map((r) => ({
      globalTrainingId: r.clientTraining.globalTrainingId,
      trainingName:
        r.clientTraining.globalTraining?.name ??
        r.clientTraining.nameAlias ??
        "Unknown",
    }));
  }

  const now = Date.now();
  const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase();

  return employees.map((emp) => {
    const empTrainingIds = emp.trainings
      .filter((t) => t.globalTraining && t.status === "completed")
      .map((t) => t.globalTrainingId);

    const certifications = emp.trainings
      .filter((t) => t.globalTraining)
      .map((t) => t.globalTraining.name);

    const missingTrainings = requiredTrainings
      .filter((req) => !empTrainingIds.includes(req.globalTrainingId))
      .map((req) => req.trainingName);

    const matchPct =
      requiredTrainings.length > 0
        ? Math.round(
            ((requiredTrainings.length - missingTrainings.length) /
              requiredTrainings.length) *
              100,
          )
        : null;

    const eligibility = missingTrainings.length === 0;

    // ── Day Off: จาก Assignment ล่าสุด (today − demobDate) ──
    const latest = emp.assignments?.[0] || null;
    const demob = latest?.demobDate ? new Date(latest.demobDate) : null;
    const dayOff = demob
      ? Math.floor((now - demob.getTime()) / 86400000)
      : null;

    // ── Medical Check up ล่าสุด (tolerant checkType) ──
    const medical =
      emp.medicalChecks?.find((m) => norm(m.checkType) === "medicalcheckup") ||
      null;

    return {
      id: emp.id,
      empCode: emp.empCode,
      fullName: emp.fullName,
      position: emp.position,
      startWorkDate: emp.startWorkDate,
      birthDate: emp.birthDate,
      mobilizationStatus: emp.mobilizationStatus,
      availabilityStatus: emp.availabilityStatus,
      certifications,
      eligibility,
      missingTrainings,
      matchPct,

      // ── roster (คนติดตัว) ──
      isPermanent: emp.isPermanent,
      healthRisk: emp.healthRisk,
      healthNote: emp.healthNote,
      sseLevel: emp.sseLevel,
      sseCompleted: emp.sseCompleted,

      // ── medical ──
      medicalExpiry: medical?.expiryDate ?? null,
      medicalStatus: medical?.status ?? null,

      // ── deployment ล่าสุด ──
      dayOff,
      platform: latest?.platform ?? null,
      mobDate: latest?.mobDate ?? null,
      demobDate: latest?.demobDate ?? null,
    };
  });
}

export async function addToShortlist({ requestId, employeeIds }) {
  let round = await prisma.candidateRound.findFirst({
    where: { requestId },
    orderBy: { round: "desc" },
  });

  if (!round) {
    round = await prisma.candidateRound.create({
      data: { requestId, round: 1 },
    });
  }

  const candidates = await Promise.all(
    employeeIds.map((employeeId) =>
      prisma.candidate.create({
        data: {
          roundId: round.id,
          employeeId,
          sourceType: "internal",
          status: "proposed",
          totalScore: 0,
          matchPct: null,
        },
        include: { employee: { include: { position: true } } },
      }),
    ),
  );

  await prisma.manpowerRequest.update({
    where: { id: requestId },
    data: { status: "proposing" },
  });

  return { round, candidates };
}

export async function getShortlist(projectId) {
  const requests = await prisma.manpowerRequest.findMany({
    where: { projectId },
    include: {
      position: true,
      rounds: {
        orderBy: { round: "desc" },
        take: 1,
        include: {
          candidates: {
            include: {
              employee: { include: { position: true } },
              decision: true,
            },
          },
        },
      },
    },
  });

  return requests.map((req) => ({
    requestId: req.id,
    position: req.position,
    quantity: req.quantity,
    status: req.status,
    candidates: req.rounds[0]?.candidates ?? [],
  }));
}

export async function approveWorkers({ candidateIds, requestId }) {
  await prisma.candidate.updateMany({
    where: { id: { in: candidateIds } },
    data: { status: "approved" },
  });

  const firstUser = await prisma.user.findFirst();

  await Promise.all(
    candidateIds.map((candidateId) =>
      prisma.clientApproval.upsert({
        where: { candidateId },
        update: { status: "approved" },
        create: {
          candidateId,
          requestId,
          status: "approved",
          decidedById: firstUser?.id ?? null,
        },
      }),
    ),
  );

  if (requestId) {
    await prisma.manpowerRequest.update({
      where: { id: requestId },
      data: { status: "approved" },
    });
  }

  return { approved: candidateIds.length };
}

// ── ยกเลิก approve → กลับเป็น proposed (ล้างให้ตรงกับ approveWorkers) ──
export async function unapproveWorkers({ candidateIds, requestId }) {
  if (!candidateIds?.length) return { count: 0 };

  // 1) status กลับเป็น proposed
  const result = await prisma.candidate.updateMany({
    where: { id: { in: candidateIds } },
    data: { status: "proposed" },
  });

  // 2) ลบ ClientApproval ที่ approveWorkers สร้างไว้ (กัน record ค้าง)
  await prisma.clientApproval.deleteMany({
    where: { candidateId: { in: candidateIds } },
  });

  // 3) ถ้า request นี้ไม่เหลือ candidate ที่ approved → revert status กลับเป็น proposing
  if (requestId) {
    const stillApproved = await prisma.candidate.count({
      where: { status: "approved", round: { requestId } },
    });
    if (stillApproved === 0) {
      await prisma.manpowerRequest.update({
        where: { id: requestId },
        data: { status: "proposing" },
      });
    }
  }

  return { count: result.count };
}

export async function removeFromShortlist(candidateId) {
  return prisma.candidate.delete({ where: { id: candidateId } });
}

export async function getWorkerEligibility(employeeId) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      position: true,
      trainings: {
        where: { isLatest: true, status: "completed" },
        include: { globalTraining: true },
      },
    },
  });

  if (!employee) return null;

  const empTrainingIds = employee.trainings
    .filter((t) => t.globalTraining)
    .map((t) => t.globalTrainingId);

  // ดึงทุก contract ที่มี position requirement ตรงกับ position ของ employee
  const contracts = await prisma.contract.findMany({
    where: { isActive: true },
    include: {
      client: true,
      positionRequirements: {
        where: { positionId: employee.positionId },
        include: {
          clientTraining: { include: { globalTraining: true } },
        },
      },
    },
  });

  const clientResults = contracts
    .filter((c) => c.positionRequirements.length > 0)
    .map((contract) => {
      const required = contract.positionRequirements.map((r) => ({
        globalTrainingId: r.clientTraining.globalTrainingId,
        name:
          r.clientTraining.globalTraining?.name ?? r.clientTraining.nameAlias,
      }));

      const completed = required.filter((r) =>
        empTrainingIds.includes(r.globalTrainingId),
      );
      const missing = required.filter(
        (r) => !empTrainingIds.includes(r.globalTrainingId),
      );
      const matchPct =
        required.length > 0
          ? Math.round((completed.length / required.length) * 100)
          : 100;

      return {
        contractId: contract.id,
        contractName: contract.name,
        clientName: contract.client.name,
        positionMatched: employee.position?.name,
        required: required.length,
        completed: completed.map((r) => r.name),
        missing: missing.map((r) => r.name),
        matchPct,
        eligible: missing.length === 0,
      };
    });

  return {
    employeeId,
    fullName: employee.fullName,
    empCode: employee.empCode,
    position: employee.position?.name,
    mobilizationStatus: employee.mobilizationStatus,
    clients: clientResults,
  };
}

// ════════════════════════════════════════════════════════════════
// CV Summary — รวมข้อมูล shortlist ของ project เพื่อทำเอกสารส่ง client
// (มีอันเดียว — เวอร์ชันซ้ำถูกลบออกแล้ว)
// ════════════════════════════════════════════════════════════════
export async function getCvSummary(projectId) {
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
        include: {
          candidates: {
            where: { status: { not: "rejected" } },
            include: {
              employee: {
                include: {
                  position: true,
                  passport: true,
                  medicalChecks: {
                    select: { checkType: true, expiryDate: true, status: true },
                  },
                  trainings: {
                    where: { isLatest: true },
                    include: { globalTraining: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase();

  const groups = requests
    .map((req) => {
      // dedupe ต่อ employee — round ใหม่ทับเก่า
      const byEmp = new Map();
      for (const round of [...req.rounds].sort((a, b) => a.round - b.round)) {
        for (const c of round.candidates) byEmp.set(c.employeeId, c);
      }

      const candidates = [...byEmp.values()].map((c) => {
        const e = c.employee;
        const medical =
          e.medicalChecks?.find(
            (m) => norm(m.checkType) === "medicalcheckup",
          ) || null;
        const certifications = e.trainings
          .filter((t) => t.globalTraining)
          .map((t) => ({
            name: t.globalTraining.name,
            expiryDate: t.expiryDate,
            status: t.status,
          }));
        return {
          fullName: e.fullName,
          empCode: e.empCode,
          position: e.position?.name || req.position?.name || null,
          nationality: e.nationality || null,
          birthDate: e.birthDate,
          startWorkDate: e.startWorkDate,
          status: c.status, // proposed | approved
          certifications,
          medical: medical
            ? { expiryDate: medical.expiryDate, status: medical.status }
            : null,
          passport: e.passport
            ? {
                passportNo: e.passport.passportNo,
                expiryDate: e.passport.expiryDate,
              }
            : null,
        };
      });

      return {
        position: req.position?.name,
        quantity: req.quantity,
        candidates,
      };
    })
    .filter((g) => g.candidates.length > 0);

  return {
    project: {
      name: project.name,
      location: project.location || null,
      client: project.contract?.client?.name || null,
      contractNo: project.contract?.contractNo || null,
    },
    generatedAt: new Date().toISOString(),
    groups,
  };
}
