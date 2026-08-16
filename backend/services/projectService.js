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
        include: {
          position: true,
          bookings: true,
          rounds: {
            orderBy: { round: "desc" },
            take: 1,
            include: {
              candidates: {
                where: { status: { not: "rejected" } },
                include: {
                  employee: {
                    select: {
                      id: true,
                      empCode: true,
                      fullName: true,
                      mobilizationStatus: true,
                    },
                  },
                },
              },
            },
          },
        },
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

// แก้ createProject: ไม่รับ name จาก input แล้ว — ดึงจาก masterRecord.jobTitle เสมอ
export async function createProject(data) {
  const {
    contractId,
    masterProjectRecordId,
    location,
    notes,
    startDate,
    endDate,
    isOffshore,
  } = data;

  if (!masterProjectRecordId) {
    const e = new Error("ต้องระบุ ON Number");
    e.code = "MASTER_RECORD_REQUIRED";
    throw e;
  }
  if (!contractId) {
    const e = new Error("ต้องเลือก Client/Contract");
    e.code = "CONTRACT_REQUIRED";
    throw e;
  }

  const masterRecord = await prisma.masterProjectRecord.findUnique({
    where: { id: masterProjectRecordId },
  });
  if (!masterRecord) {
    const e = new Error("ไม่พบ Master Project Record นี้");
    e.code = "MASTER_RECORD_NOT_FOUND";
    throw e;
  }

  return prisma.project.create({
    data: {
      name: masterRecord.jobTitle,
      contractId,
      location: location || null,
      notes: notes || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isOffshore: isOffshore ?? false,
      masterProjectRecordId,
    },
    include: {
      contract: { include: { client: true } },
      masterProjectRecord: true,
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
  const projectId = String(id);

  return prisma.$transaction(async (tx) => {
    const requests = await tx.manpowerRequest.findMany({
      where: { projectId },
      select: { id: true },
    });
    const requestIds = requests.map((r) => r.id);

    const rounds = await tx.candidateRound.findMany({
      where: { requestId: { in: requestIds } },
      select: { id: true },
    });
    const roundIds = rounds.map((r) => r.id);

    const candidates = await tx.candidate.findMany({
      where: { roundId: { in: roundIds } },
      select: { id: true },
    });
    const candidateIds = candidates.map((c) => c.id);

    const bookings = await tx.booking.findMany({
      where: { requestId: { in: requestIds } },
      select: { id: true },
    });
    const bookingIds = bookings.map((b) => b.id);

    const subReqs = await tx.subcontractorRequest.findMany({
      where: { requestId: { in: requestIds } },
      select: { id: true },
    });
    const subReqIds = subReqs.map((s) => s.id);

    await tx.candidateGap.deleteMany({
      where: { candidateId: { in: candidateIds } },
    });
    await tx.candidateScore.deleteMany({
      where: { candidateId: { in: candidateIds } },
    });
    await tx.clientApproval.deleteMany({
      where: { requestId: { in: requestIds } },
    });
    await tx.candidate.deleteMany({ where: { roundId: { in: roundIds } } });
    await tx.candidateRound.deleteMany({
      where: { requestId: { in: requestIds } },
    });
    await tx.mobilizationTask.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await tx.assignment.deleteMany({
      where: {
        OR: [{ projectId }, { bookingId: { in: bookingIds } }],
      },
    });
    await tx.booking.deleteMany({ where: { requestId: { in: requestIds } } });
    await tx.sSERecord.deleteMany({ where: { requestId: { in: requestIds } } });
    await tx.subcontractorHire.deleteMany({
      where: { subcontractorRequestId: { in: subReqIds } },
    });
    await tx.subcontractorRequest.deleteMany({
      where: { requestId: { in: requestIds } },
    });
    await tx.workflowLog.deleteMany({
      where: { requestId: { in: requestIds } },
    });
    await tx.manpowerRequest.deleteMany({ where: { id: { in: requestIds } } });
    await tx.performanceReview.deleteMany({ where: { projectId } });
    await tx.projectMessage.deleteMany({ where: { projectId } }); // attachments cascade อัตโนมัติ

    return tx.project.delete({ where: { id: projectId } });
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
// เดิม: กันลบถ้ามี booking ผูกอยู่ — แต่หลังเพิ่ม Mobilization checklist shim
// (findOrCreateBooking ใน mobilizationService.js) ทุก candidate ที่ approved
// จะมี Booking ติดมาด้วยเสมอ (ใช้เป็นที่เก็บ MobilizationTask เท่านั้น ไม่ใช่
// deploy state จริง — deploy state จริงอยู่ที่ Assignment(bookingId=null))
// จึงเปลี่ยนจาก "ห้ามลบ" เป็น "ลบ Booking + MobilizationTask ทิ้งไปด้วย"
// ยกเว้นกรณีมี Assignment จริงผูกกับ Booking นั้น (deployed ผ่าน booking flow จริง)
export async function deleteProjectRequest(projectId, requestId) {
  const reqRow = await prisma.manpowerRequest.findFirst({
    where: { id: String(requestId), projectId: String(projectId) },
    include: {
      bookings: {
        select: { id: true, assignment: { select: { id: true } } },
      },
      rounds: { select: { id: true } },
    },
  });

  if (!reqRow) {
    const e = new Error("Request not found");
    e.code = "P2025";
    throw e;
  }

  // มี Booking ที่ deploy จริงผ่าน booking flow (มี Assignment ผูกอยู่) → ห้ามลบ
  const realBookings = reqRow.bookings.filter((b) => b.assignment);
  if (realBookings.length > 0) {
    const e = new Error("Request has real bookings with assignments");
    e.code = "REQUEST_HAS_BOOKINGS";
    throw e;
  }

  const shimBookingIds = reqRow.bookings.map((b) => b.id);
  const roundIds = reqRow.rounds.map((r) => r.id);

  return prisma.$transaction(async (tx) => {
    // 0) ลบ shim booking (checklist) ทิ้งไปก่อน — cascade MobilizationTask ด้วย
    if (shimBookingIds.length > 0) {
      await tx.mobilizationTask.deleteMany({
        where: { bookingId: { in: shimBookingIds } },
      });
      await tx.booking.deleteMany({
        where: { id: { in: shimBookingIds } },
      });
    }

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

export async function updateProjectRequestQuantity(
  projectId,
  requestId,
  quantity,
) {
  const reqRow = await prisma.manpowerRequest.findFirst({
    where: { id: String(requestId), projectId: String(projectId) },
  });
  if (!reqRow) {
    const e = new Error("Request not found");
    e.code = "P2025";
    throw e;
  }
  return prisma.manpowerRequest.update({
    where: { id: String(requestId) },
    data: { quantity: Number(quantity) },
    include: { position: true },
  });
}

// ════════════════════════════════════════════════════════════════
// ค้นหา MasterProjectRecord ที่ยังไม่ถูกผูกกับ Project ไหน (สำหรับ autocomplete)
// ════════════════════════════════════════════════════════════════
export async function searchMasterProjectRecords(search) {
  const q = (search || "").trim();

  return prisma.masterProjectRecord.findMany({
    where: q
      ? {
          OR: [
            { projectCode: { contains: q, mode: "insensitive" } },
            { jobTitle: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { projectCode: "asc" },
    take: 20,
  });
}

// รายการปีทั้งหมดที่มีใน Master Project Register (สำหรับทำ tabs)
export async function getMasterProjectYears() {
  const rows = await prisma.masterProjectRecord.findMany({
    distinct: ["year"],
    select: { year: true },
    orderBy: { year: "desc" },
  });
  return rows.map((r) => r.year);
}

// list แบบ paginate ต่อปี พร้อมสถานะว่าถูกเปิดใช้งาน (linked) แล้วหรือยัง
export async function browseMasterProjectRecords({
  year,
  search,
  page = 1,
  pageSize = 15,
}) {
  const q = (search || "").trim();
  const where = {
    ...(year ? { year: Number(year) } : {}),
    ...(q
      ? {
          OR: [
            { projectCode: { contains: q, mode: "insensitive" } },
            { jobTitle: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { engineer: { contains: q, mode: "insensitive" } },
            { owner: { contains: q, mode: "insensitive" } },
            { ccNo: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const skip = (Number(page) - 1) * Number(pageSize);

  const [records, total] = await Promise.all([
    prisma.masterProjectRecord.findMany({
      where,
      include: {
        linkedProjects: {
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { projectCode: "asc" },
      skip,
      take: Number(pageSize),
    }),
    prisma.masterProjectRecord.count({ where }),
  ]);

  return {
    records,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.max(1, Math.ceil(total / Number(pageSize))),
  };
}
