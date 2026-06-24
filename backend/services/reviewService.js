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
  }));
}

// ════════════════════════════════════════════════════════════════
// GET — deployed workers ของ project + review เดิม (ถ้ามี)
// ════════════════════════════════════════════════════════════════
export async function getReviewDetail(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { contract: { include: { client: true } } },
  });
  if (!project) return null;

  const assignments = await prisma.assignment.findMany({
    where: { projectId },
    include: { employee: { include: { position: true } } },
    orderBy: { createdAt: "asc" },
  });

  const reviews = await prisma.performanceReview.findMany({
    where: { projectId },
  });
  const reviewByEmp = new Map(reviews.map((r) => [r.employeeId, r]));

  const workers = assignments.map((a) => {
    const e = a.employee;
    const rev = reviewByEmp.get(e.id) || null;
    return {
      assignmentId: a.id,
      employeeId: e.id,
      empCode: e.empCode,
      fullName: e.fullName,
      position: e.position?.name ?? null,
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
