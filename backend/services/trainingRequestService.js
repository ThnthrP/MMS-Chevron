import { PrismaClient } from "@prisma/client";
import {
  parseMeta,
  decisionData,
  countStatuses,
  notifyRequester,
  findJobClashes,
  toDate,
  badRequest,
} from "./bookingHelpers.js";

const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════════
// Training Bookings
//   batch = 1 คำขอ (วันที่ที่ต้องการ / สถานที่ / หมายเหตุ อยู่ที่ batch)
//   item  = 1 คน × 1 training — HR ยืนยัน / ปฏิเสธ รายคน (status ของ item)
//   batch.status = completed อัตโนมัติเมื่อไม่เหลือ item ที่รอ HR
// ══════════════════════════════════════════════════════════

export async function createBatch(requestedById, items, meta) {
  // items: [{ employeeId, globalTrainingId, clientName }]
  const batch = await prisma.trainingRequestBatch.create({
    data: {
      requestedById: requestedById || null,
      ...parseMeta(meta),
      items: {
        create: items.map((i) => ({
          employeeId: i.employeeId,
          globalTrainingId: i.globalTrainingId,
          clientName: i.clientName || null,
        })),
      },
    },
    include: {
      items: {
        include: {
          employee: { select: { fullName: true, empCode: true } },
          globalTraining: { select: { name: true } },
        },
      },
    },
  });

  const employeeCount = new Set(batch.items.map((i) => i.employeeId)).size;
  const trainingCount = new Set(batch.items.map((i) => i.globalTrainingId))
    .size;

  return { batch, employeeCount, trainingCount };
}

export async function getBatch(id) {
  const batch = await prisma.trainingRequestBatch.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { name: true } },
      items: {
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              empCode: true,
              empId: true,
              position: { select: { name: true } },
            },
          },
          globalTraining: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!batch) {
    const err = new Error("Training request not found");
    err.status = 404;
    throw err;
  }

  // group by training สำหรับหน้าสรุป
  const grouped = {};
  for (const item of batch.items) {
    const key = item.globalTraining.id;
    if (!grouped[key]) {
      grouped[key] = {
        trainingId: key,
        trainingName: item.globalTraining.name,
        employees: [],
      };
    }
    grouped[key].employees.push({
      itemId: item.id,
      employeeId: item.employee.id,
      fullName: item.employee.fullName,
      empCode: item.employee.empCode,
      empId: item.employee.empId,
      position: item.employee.position?.name || null,
      clientName: item.clientName,
      status: item.status,
      confirmedStart: item.confirmedStart,
      confirmedEnd: item.confirmedEnd,
      confirmedProvider: item.confirmedProvider,
      hrNote: item.hrNote,
      decidedAt: item.decidedAt,
      decidedByName: item.decidedByName,
    });
  }

  return {
    id: batch.id,
    requestedByName: batch.requestedBy?.name || null,
    createdAt: batch.createdAt,
    status: batch.status,
    requestedStart: batch.requestedStart,
    requestedEnd: batch.requestedEnd,
    provider: batch.provider,
    remarks: batch.remarks,
    counts: countStatuses(batch.items),
    groups: Object.values(grouped),
  };
}

export async function getAllBatches() {
  const batches = await prisma.trainingRequestBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      items: {
        select: {
          employeeId: true,
          globalTrainingId: true,
          clientName: true,
          status: true,
          globalTraining: { select: { name: true } },
        },
      },
    },
  });

  return batches.map((b) => {
    const trainingNames = [
      ...new Set(b.items.map((i) => i.globalTraining?.name).filter(Boolean)),
    ];
    const clientNames = [
      ...new Set(b.items.map((i) => i.clientName).filter(Boolean)),
    ];

    return {
      id: b.id,
      requestedByName: b.requestedBy?.name || null,
      createdAt: b.createdAt,
      status: b.status,
      requestedStart: b.requestedStart,
      requestedEnd: b.requestedEnd,
      provider: b.provider,
      remarks: b.remarks,
      counts: countStatuses(b.items),
      employeeCount: new Set(b.items.map((i) => i.employeeId)).size,
      trainingCount: new Set(b.items.map((i) => i.globalTrainingId)).size,
      itemCount: b.items.length,
      trainingNames,
      clientNames,
    };
  });
}

export async function updateStatus(id, status) {
  if (!["pending", "completed"].includes(status)) {
    const err = new Error("Invalid status value");
    err.status = 400;
    throw err;
  }
  const batch = await prisma.trainingRequestBatch.update({
    where: { id },
    data: { status },
  });
  return batch;
}

// ── HR ยืนยัน / ปฏิเสธ รายคน ──
// body: { itemIds[], decision: confirmed|rejected|pending, confirmedStart, confirmedEnd, provider, note }
export async function decideItems(batchId, body, actor) {
  const itemIds = Array.isArray(body.itemIds) ? body.itemIds : [];
  if (itemIds.length === 0) throw badRequest("itemIds are required");
  const data = decisionData(body.decision, body, actor?.name);

  const batch = await prisma.trainingRequestBatch.findUnique({
    where: { id: batchId },
    select: { id: true, requestedById: true },
  });
  if (!batch) {
    const err = new Error("Training request not found");
    err.status = 404;
    throw err;
  }

  const { count } = await prisma.trainingRequestItem.updateMany({
    where: { id: { in: itemIds }, batchId },
    data,
  });

  // ไม่เหลือคนที่รอ HR → ปิดคำขออัตโนมัติ (ย้อนเป็น pending ได้ถ้ากด undo)
  const stillPending = await prisma.trainingRequestItem.count({
    where: { batchId, status: "pending" },
  });
  await prisma.trainingRequestBatch.update({
    where: { id: batchId },
    data: { status: stillPending === 0 ? "completed" : "pending" },
  });

  if (body.decision !== "pending" && count > 0) {
    await notifyRequester(prisma, batch, actor?.id, {
      type: "training_request_decision",
      title:
        body.decision === "confirmed"
          ? `HR ยืนยันอบรมแล้ว ${count} คน`
          : `HR ปฏิเสธคำขออบรม ${count} คน`,
      message: data.hrNote || null,
      link: `/training-requests/${batchId}`,
    });
  }

  return getBatch(batchId);
}

// ── ตอนขอจอง: ใครติดงานในช่วงนี้ / ใครมีคำขอหลักสูตรนี้ค้างอยู่แล้ว ──
export async function getAvailability({ start, end, globalTrainingId, employeeIds }) {
  const jobs = await findJobClashes(prisma, start, end, employeeIds);

  let requested = [];
  if (globalTrainingId) {
    const today = new Date(new Date().toDateString());
    const items = await prisma.trainingRequestItem.findMany({
      where: {
        globalTrainingId,
        ...(employeeIds?.length ? { employeeId: { in: employeeIds } } : {}),
        OR: [
          { status: "pending" },
          {
            status: "confirmed",
            OR: [{ confirmedEnd: null }, { confirmedEnd: { gte: today } }],
          },
        ],
      },
      select: { employeeId: true },
    });
    requested = [...new Set(items.map((i) => i.employeeId))];
  }
  return { jobs, requested, start: toDate(start), end: toDate(end) };
}
