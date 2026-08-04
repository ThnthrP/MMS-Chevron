import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// อายุเกษียณ (ให้ตรงกับ frontend Allocation.jsx)
const RETIREMENT_AGE = 60;

// ── ค่า requirementType ที่นับเป็น "Mandatory" (สัญลักษณ์ X) ──
// เหมือนกับที่ใช้ใน complianceService.js — "required" (bulk import) และ
// "mandatory" (แก้ผ่าน MatrixEditor) เป็นความหมายเดียวกันสำหรับ Chevron
const MANDATORY_REQUIREMENT_TYPES = ["required", "mandatory"];

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
  // เฉพาะ requirementType ที่เป็น Mandatory (required + mandatory) — ไม่นับ assigned
  // (ให้ % Match ที่นี่ตรงกับคอลัมน์ CHEVRON MATCH ในหน้า Compliance)
  let requiredTrainings = [];

  if (positionId && contractId) {
    const requirements = await prisma.positionRequirement.findMany({
      where: {
        positionId,
        contractId,
        requirementType: { in: MANDATORY_REQUIREMENT_TYPES },
      },
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

// ============================================================
// Eligibility check รายคน — แยก 3 กลุ่มต่อ client
//   mandatory : PositionRequirement ที่ requirementType อยู่ใน MANDATORY_REQUIREMENT_TYPES
//   assigned  : PositionRequirement ที่ requirementType = "assigned"
//   others    : training ที่พนักงานมี แต่ไม่อยู่ใน matrix (mandatory+assigned) ของ client นั้นเลย
// matchPct / eligible ของแต่ละ client อิงจากกลุ่ม mandatory เท่านั้น
// (ตรงกับตรรกะเดียวกับ complianceService.js)
// ============================================================
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

  const employeeTrainingByGlobalId = new Map();
  for (const t of employee.trainings) {
    if (t.globalTrainingId) {
      employeeTrainingByGlobalId.set(
        t.globalTrainingId,
        t.globalTraining?.name,
      );
    }
  }
  const empTrainingIds = new Set(employeeTrainingByGlobalId.keys());

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
      const mandatory = { required: [], completed: [], missing: [] };
      const assigned = { required: [], completed: [], missing: [] };
      const matrixIds = new Set();

      for (const r of contract.positionRequirements) {
        const name =
          r.clientTraining.globalTraining?.name ?? r.clientTraining.nameAlias;
        const gtId = r.clientTraining.globalTrainingId;
        matrixIds.add(gtId);

        let group = null;
        if (MANDATORY_REQUIREMENT_TYPES.includes(r.requirementType)) {
          group = mandatory;
        } else if (r.requirementType === "assigned") {
          group = assigned;
        }
        if (!group) continue;

        group.required.push(name);
        const entry = { name, trainingId: gtId };
        if (empTrainingIds.has(gtId)) {
          group.completed.push(entry);
        } else {
          group.missing.push(entry);
        }
      }

      // Others — training ที่พนักงานมีจริง แต่ไม่อยู่ใน matrix ของ client นี้เลย
      const others = { completed: [] };
      for (const [gtId, name] of employeeTrainingByGlobalId) {
        if (!matrixIds.has(gtId)) {
          others.completed.push(name);
        }
      }

      const matchPct =
        mandatory.required.length > 0
          ? Math.round(
              (mandatory.completed.length / mandatory.required.length) * 100,
            )
          : 100;

      return {
        contractId: contract.id,
        contractName: contract.name,
        clientName: contract.client.name,
        positionMatched: employee.position?.name,
        mandatory,
        assigned,
        others,
        matchPct,
        eligible: mandatory.missing.length === 0,
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
// CV Summary — เวอร์ชันใหม่: หน้าตาตรงกับเรซูเม่จริงที่ส่งลูกค้า
// (แทนที่ getCvSummary เดิมในไฟล์ allocationService.js — ฟังก์ชันอื่นเหมือนเดิม)
//
// โครงสร้าง candidate แต่ละคนตอนนี้แบ่งเป็น 3 ส่วนเหมือนเรซูเม่:
//   personal            — Personal Details (address, gender, height ฯลฯ)
//   trainedCourses      — list ของ training เรียงวันที่ล่าสุดก่อน
//   professional        — { company, currentPosition, responsibilities[], projectReferences[] }
//
// ⚠ ต้อง migrate schema ก่อน (Employee.address/gender/height/weight/religion/
//   language/education/photoUrl, Position.responsibilities, Assignment.positionId,
//   Project.cvLabel) ไม่งั้น query พวกนี้จะพัง
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
                  position: true, // ตำแหน่งปัจจุบัน — ใช้เป็น fallback + หา responsibilities
                  passport: true,
                  medicalChecks: {
                    select: { checkType: true, expiryDate: true, status: true },
                  },
                  trainings: {
                    where: { isLatest: true },
                    include: { globalTraining: true },
                    orderBy: { completedDate: "desc" },
                  },
                  // ประวัติ deploy ทั้งหมด (ทุก project) → "Project References"
                  assignments: {
                    orderBy: { mobDate: "desc" },
                    include: {
                      position: true, // ตำแหน่ง ณ ตอน deploy รอบนั้น (snapshot)
                      project: {
                        include: { contract: { include: { client: true } } },
                      },
                    },
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

        // ── Trained Courses ──
        const trainedCourses = e.trainings
          .filter((t) => t.globalTraining || t.rawTrainingName)
          .map((t) => ({
            name: t.globalTraining?.name ?? t.rawTrainingName,
            completedDate: t.completedDate,
            institute: t.institute ?? null,
          }));

        // ── Professional Experience ──
        const currentPosition = e.position?.name || req.position?.name || null;
        const responsibilities = e.position?.responsibilities
          ? e.position.responsibilities
              .split("\n")
              .filter((line) => line.trim())
          : [];

        const projectReferences = e.assignments
          .filter((a) => a.mobDate) // ข้าม record ที่ยังไม่มีวันที่ (ไม่พร้อมแสดงในเรซูเม่)
          .map((a) => ({
            projectLabel:
              a.project?.cvLabel ||
              a.project?.name ||
              a.projectLabel || // ← เพิ่ม — สำหรับ manual/historical entry
              (a.platform ? `Deployment at ${a.platform}` : "—"),
            position: a.position?.name ?? currentPosition,
            mobDate: a.mobDate,
            demobDate: a.demobDate,
            platform: a.platform,
          }));

        return {
          fullName: e.fullName,
          empCode: e.empCode,
          position: currentPosition,
          nationality: e.nationality || null,
          birthDate: e.birthDate,
          startWorkDate: e.startWorkDate,
          status: c.status,

          // ── Personal Details (ส่วนใหม่) ──
          personal: {
            address: e.address || null,
            gender: e.gender || null,
            height: e.height ?? null,
            weight: e.weight ?? null,
            religion: e.religion || null,
            language: e.language || null,
            education: e.education || null,
            photoUrl: e.photoUrl || null,
            phone: e.phone || null,
            email: e.email || null,
          },

          trainedCourses,

          professional: {
            company: "Experteam Co., Ltd.",
            currentPosition,
            responsibilities,
            projectReferences,
          },

          // ── ของเดิม (ยังใช้อยู่ในการ์ดสรุป/eligibility อื่น) ──
          certifications: e.trainings
            .filter((t) => t.globalTraining)
            .map((t) => ({
              name: t.globalTraining.name,
              expiryDate: t.expiryDate,
              status: t.status,
            })),
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

// ════════════════════════════════════════════════════════════════
// Roster (MOB/D-MOB) — export แยกต่างหาก สำหรับสรุปรอบ mobilize
// ตรงกับ sheet "Day off (x-x-xx)" ที่ HR ทำมือใน Excel ทุกวันนี้
//
// ⚠ 2 field ที่ยังไม่มีใน schema เลย — คืนเป็น null แล้วให้ frontend
//   เปิดช่องกรอกเองก่อน export/print:
//   - "from" (ในตัวอย่าง Excel เป็น "STH" — ยังไม่ทราบว่ามาจากไหน)
//   - "remark" (เช่น "ขึ้นด่วน", "ติดงาน Project")
// ════════════════════════════════════════════════════════════════
export async function getRoster(projectId) {
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
            include: { employee: { include: { position: true } } },
          },
        },
      },
    },
  });

  // dedupe ต่อ employee เหมือน getCvSummary (round ใหม่ทับเก่า)
  const employeeMap = new Map(); // employeeId -> { employee, positionName }
  for (const req of requests) {
    for (const round of [...req.rounds].sort((a, b) => a.round - b.round)) {
      for (const c of round.candidates) {
        employeeMap.set(c.employeeId, {
          employee: c.employee,
          positionName: c.employee.position?.name || req.position?.name || null,
        });
      }
    }
  }

  const employeeIds = [...employeeMap.keys()];

  if (employeeIds.length === 0) {
    return {
      project: {
        name: project.name,
        location: project.location || null,
        client: project.contract?.client?.name || null,
        startDate: project.startDate || null,
      },
      rows: [],
    };
  }

  // โหลด Assignment ทั้งหมดของคนกลุ่มนี้ (ทั้งของ project นี้ + รอบก่อนหน้า)
  // เรียง mobDate desc ล่วงหน้า เพื่อให้ .find() ด้านล่างได้ตัวล่าสุดเสมอ
  const assignments = await prisma.assignment.findMany({
    where: { employeeId: { in: employeeIds } },
    orderBy: { mobDate: "desc" },
  });

  const workingDay = project.startDate || null;
  const workingDayMs = workingDay ? new Date(workingDay).getTime() : Date.now();

  const rows = employeeIds.map((empId) => {
    const { employee, positionName } = employeeMap.get(empId);
    const empAssignments = assignments.filter((a) => a.employeeId === empId);

    // TO — assignment ที่ผูกกับ project นี้โดยตรง (ถ้ามีการสร้างไว้แล้ว)
    const currentAssignment =
      empAssignments.find((a) => a.projectId === projectId) || null;

    // Previous — assignment ล่าสุดที่ "ไม่ใช่" ของ project นี้ และ demob ไปแล้วจริง
    // (มาจาก array ที่เรียง mobDate desc แล้ว → เจอตัวแรกคือล่าสุด)
    const previousAssignment =
      empAssignments.find((a) => a.projectId !== projectId && a.demobDate) ||
      null;

    const dayOff = previousAssignment?.demobDate
      ? Math.floor(
          (workingDayMs - new Date(previousAssignment.demobDate).getTime()) /
            86400000,
        )
      : null;

    return {
      employeeId: empId,
      fullName: employee.fullName,
      empCode: employee.empCode,
      position: positionName,
      company: "Experteam", // ค่าคงที่ตาม pattern เดิม — ยังไม่มี field แยกใน schema
      from: null, // ยังไม่มีใน schema — ให้กรอกเองฝั่ง frontend
      to: currentAssignment?.platform ?? null,
      mobDate: previousAssignment?.mobDate ?? null,
      demobDate: previousAssignment?.demobDate ?? null,
      workingDay,
      dayOff,
      previousLocation: previousAssignment?.platform ?? null,
      remark: null, // ยังไม่มีใน schema — ให้กรอกเองฝั่ง frontend
    };
  });

  return {
    project: {
      name: project.name,
      location: project.location || null,
      client: project.contract?.client?.name || null,
      startDate: workingDay,
    },
    rows,
  };
}

// ════════════════════════════════════════════════════════════════
// Skill Matrix — export แยกต่างหาก แบบ pivot (แถว=คน, คอลัมน์=training)
// ตรงกับ sheet "Skill matrix (All)" — columns มาจาก union ของ
// PositionRequirement (mandatory+assigned) ของทุกตำแหน่งที่มีคนอยู่ใน
// shortlist รอบนี้ ภายใต้ contract ของ project นี้
// ════════════════════════════════════════════════════════════════
export async function getSkillMatrix(projectId) {
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

  // dedupe ต่อ employee + เก็บ positionId ไว้หา PositionRequirement
  const employeeMap = new Map(); // employeeId -> employee (with trainings, position)
  const positionIds = new Set();
  for (const req of requests) {
    for (const round of [...req.rounds].sort((a, b) => a.round - b.round)) {
      for (const c of round.candidates) {
        employeeMap.set(c.employeeId, c.employee);
        if (c.employee.positionId) positionIds.add(c.employee.positionId);
      }
    }
  }

  if (employeeMap.size === 0) {
    return {
      project: {
        name: project.name,
        client: project.contract?.client?.name || null,
      },
      trainings: [],
      rows: [],
    };
  }

  // ── columns: union training (mandatory + assigned) ของทุกตำแหน่งในกลุ่มนี้ ──
  const positionRequirements = await prisma.positionRequirement.findMany({
    where: {
      contractId: project.contractId,
      positionId: { in: [...positionIds] },
    },
    include: { clientTraining: { include: { globalTraining: true } } },
  });

  const trainingMap = new Map(); // globalTrainingId -> name
  for (const r of positionRequirements) {
    const gtId = r.clientTraining.globalTrainingId;
    const name =
      r.clientTraining.globalTraining?.name ?? r.clientTraining.nameAlias;
    if (gtId && !trainingMap.has(gtId)) trainingMap.set(gtId, name);
  }
  const trainings = [...trainingMap.entries()].map(([id, name]) => ({
    id,
    name,
  }));

  // ── rows: ต่อ employee — cell = completed/expiry/status ของ training นั้น (ถ้ามี) ──
  const rows = [...employeeMap.entries()].map(([empId, employee]) => {
    const byGlobalId = new Map();
    for (const t of employee.trainings) {
      if (t.globalTrainingId) byGlobalId.set(t.globalTrainingId, t);
    }

    const cells = trainings.map((tr) => {
      const t = byGlobalId.get(tr.id);
      return {
        trainingId: tr.id,
        completedDate: t?.completedDate ?? null,
        expiryDate: t?.expiryDate ?? null,
        status: t?.status ?? null, // completed | overdue | due_soon | if_required | null (ไม่มีข้อมูล)
      };
    });

    return {
      employeeId: empId,
      fullName: employee.fullName,
      empCode: employee.empCode,
      position: employee.position?.name ?? null,
      cells,
    };
  });

  return {
    project: {
      name: project.name,
      client: project.contract?.client?.name || null,
    },
    trainings,
    rows,
  };
}
