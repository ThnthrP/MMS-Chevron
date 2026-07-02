import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getProjects() {
  return prisma.project.findMany({
    include: {
      contract: {
        include: { client: true },
      },
      requests: {
        include: { position: true, bookings: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectById(id) {
  return prisma.project.findUnique({
    where: { id: String(id) },
    include: {
      contract: {
        include: { client: true },
      },
      requests: {
        include: { position: true, bookings: true },
      },
      assignments: {
        include: {
          employee: {
            include: { position: true },
          },
        },
      },
    },
  });
}

export async function createProject(data) {
  const { name, contractId, location, notes, startDate, endDate, isOffshore } =
    data;
  return prisma.project.create({
    data: {
      name,
      contractId,
      location: location || null,
      notes: notes || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isOffshore: isOffshore ?? false, // ← เพิ่มบรรทัดนี้
    },
    include: {
      contract: { include: { client: true } },
    },
  });
}

// อัปเดต project — รวม isOffshore + คืน contract/client มาให้ frontend ใช้ต่อ
// หมายเหตุ: การ lock contract เมื่อมี request แล้ว enforce ฝั่ง frontend (dropdown read-only)
export async function updateProject(id, data) {
  return prisma.project.update({
    where: { id: String(id) },
    data: {
      name: data.name,
      contractId: data.contractId,
      location: data.location || null,
      notes: data.notes || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isOffshore: data.isOffshore ?? false,
    },
    include: {
      contract: { include: { client: true } },
    },
  });
}

export async function deleteProject(id) {
  return prisma.project.delete({
    where: { id: String(id) },
  });
}

// ─── Add ManpowerRequest to Project ───
export async function addProjectRequest(projectId, data) {
  const { positionId, quantity } = data;

  // ชั่วคราว: ใช้ user แรกใน DB จนกว่าจะมี auth middleware ส่ง req.user
  const firstUser = await prisma.user.findFirst();

  return prisma.manpowerRequest.create({
    data: {
      projectId,
      positionId,
      quantity: Number(quantity),
      status: "draft",
      selectionMode: "manual",
      requestedById: firstUser.id,
    },
    include: {
      position: true,
    },
  });
}

// ─── Delete ManpowerRequest from Project ───
// กันลบถ้ามี booking ผูกอยู่ (กันข้อมูล deploy หาย) — ต้องยกเลิก booking ก่อน
// ลบ child rows ที่ปลอดภัย (rounds→candidates→gaps/score/approval, sseRecords,
// subcontractorRequests→hires, workflowLogs) ใน transaction ก่อนลบ request
export async function deleteProjectRequest(projectId, requestId) {
  const reqRow = await prisma.manpowerRequest.findFirst({
    where: { id: String(requestId), projectId: String(projectId) },
    include: {
      bookings: { select: { id: true } },
      rounds: { select: { id: true } },
    },
  });

  if (!reqRow) {
    const e = new Error("Request not found");
    e.code = "P2025";
    throw e;
  }

  // มี booking → ห้ามลบ (ผ่าน allocation/deploy ไปแล้ว)
  if (reqRow.bookings.length > 0) {
    const e = new Error("Request has bookings");
    e.code = "REQUEST_HAS_BOOKINGS";
    throw e;
  }

  const roundIds = reqRow.rounds.map((r) => r.id);

  return prisma.$transaction(async (tx) => {
    // 1) ลบสิ่งที่ห้อยใต้ candidates ก่อน
    if (roundIds.length > 0) {
      const cands = await tx.candidate.findMany({
        where: { roundId: { in: roundIds } },
        select: { id: true },
      });
      const candIds = cands.map((c) => c.id);

      if (candIds.length > 0) {
        await tx.candidateGap.deleteMany({
          where: { candidateId: { in: candIds } },
        });
        await tx.candidateScore.deleteMany({
          where: { candidateId: { in: candIds } },
        });
        await tx.clientApproval.deleteMany({
          where: { candidateId: { in: candIds } },
        });
        await tx.candidate.deleteMany({
          where: { id: { in: candIds } },
        });
      }
      await tx.candidateRound.deleteMany({
        where: { id: { in: roundIds } },
      });
    }

    // 2) ลบ child อื่น ๆ ที่อ้าง requestId
    await tx.clientApproval.deleteMany({
      where: { requestId: String(requestId) },
    });
    await tx.sSERecord.deleteMany({ where: { requestId: String(requestId) } });
    await tx.workflowLog.deleteMany({
      where: { requestId: String(requestId) },
    });

    // subcontractorRequests → hires ก่อน
    const subReqs = await tx.subcontractorRequest.findMany({
      where: { requestId: String(requestId) },
      select: { id: true },
    });
    const subReqIds = subReqs.map((s) => s.id);
    if (subReqIds.length > 0) {
      await tx.subcontractorHire.deleteMany({
        where: { subcontractorRequestId: { in: subReqIds } },
      });
      await tx.subcontractorRequest.deleteMany({
        where: { id: { in: subReqIds } },
      });
    }

    // 3) ลบ request
    return tx.manpowerRequest.delete({ where: { id: String(requestId) } });
  });
}
