import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════
// GET — projects ที่มีคน deploy แล้ว (active/completed) สำหรับ dropdown
// ════════════════════════════════════════════════════════════════
export async function getReviewProjects() {
  const projects = await prisma.project.findMany({
    where: { assignments: { some: {} } }, // มี assignment = เคย deploy
    include: {
      contract: { include: { client: true } },
      masterProjectRecord: { select: { projectCode: true } }, // ← เพิ่ม
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    client: p.contract?.client?.name ?? null,
    deployedCount: p._count.assignments,
    location: p.location ?? null, // ← เพิ่ม
    startDate: p.startDate ?? null, // ← เพิ่ม
    masterProjectRecord: p.masterProjectRecord
      ? { projectCode: p.masterProjectRecord.projectCode }
      : null, // ← เพิ่ม
  }));
}

// ════════════════════════════════════════════════════════════════
// GET — deployed workers ของ project + review เดิม (ถ้ามี)
// ════════════════════════════════════════════════════════════════
export async function getReviewDetail(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      contract: { include: { client: true } },
      masterProjectRecord: { select: { projectCode: true } },
    },
  });
  if (!project) return null;

  const assignments = await prisma.assignment.findMany({
    where: { projectId },
    include: {
      employee: { include: { position: true } },
      position: { select: { name: true } }, // ตำแหน่งที่ลงงานจริง (snapshot ตอน deploy)
    },
    orderBy: { createdAt: "asc" },
  });

  const reviews = await prisma.performanceReview.findMany({
    where: { projectId },
    include: { reviewedBy: { select: { name: true, titlePrefix: true } } },
  });
  const reviewByEmp = new Map(reviews.map((r) => [r.employeeId, r]));

  // 1 คนอาจมีหลาย assignment ในโปรเจกต์เดียว (ลงซ้ำ) — review เป็นรายคน จึงเก็บรอบล่าสุด
  const latestByEmp = new Map();
  for (const a of assignments) latestByEmp.set(a.employeeId, a);

  const workers = [...latestByEmp.values()].map((a) => {
    const e = a.employee;
    const rev = reviewByEmp.get(e.id) || null;
    return {
      assignmentId: a.id,
      employeeId: e.id,
      empCode: e.empCode,
      empId: e.empId,
      fullName: e.fullName,
      fullNameTH: e.fullNameTH ?? null,
      position: a.position?.name ?? e.position?.name ?? null,
      platform: a.platform,
      mobDate: a.mobDate,
      demobDate: a.demobDate,
      assignmentStatus: a.status,
      review: rev
        ? {
            rating: rev.rating,
            rehire: rev.rehire,
            comment: rev.comment,
            reviewedAt: rev.updatedAt,
            reviewer: rev.reviewedBy
              ? `${rev.reviewedBy.titlePrefix ?? ""}${rev.reviewedBy.name ?? ""}`
              : null,
          }
        : null,
    };
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      client: project.contract?.client?.name ?? null,
      location: project.location ?? null,
      projectCode: project.masterProjectRecord?.projectCode ?? null,
      startDate: project.startDate,
      endDate: project.endDate,
    },
    workers,
  };
}

// ════════════════════════════════════════════════════════════════
// POST — บันทึก review (upsert ต่อ employee+project)
// ════════════════════════════════════════════════════════════════
export async function saveReview({
  projectId,
  employeeId,
  rating,
  rehire,
  comment,
  reviewedById,
}) {
  return prisma.performanceReview.upsert({
    where: { employeeId_projectId: { employeeId, projectId } },
    update: { rating, rehire, comment, reviewedById: reviewedById ?? null },
    create: {
      projectId,
      employeeId,
      rating,
      rehire,
      comment,
      reviewedById: reviewedById ?? null,
    },
  });
}

// ════════════════════════════════════════════════════════════════
// PUT — Mark Project Completed
//   project.status → completed
//   assignment ของ project นี้ → completed (ปิดงาน, คนพ้นแท่น)
// ════════════════════════════════════════════════════════════════
export async function completeProject({ projectId }) {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status: "completed" },
  });

  await prisma.assignment.updateMany({
    where: { projectId, status: { not: "cancelled" } },
    data: { status: "completed" },
  });

  return { project };
}
