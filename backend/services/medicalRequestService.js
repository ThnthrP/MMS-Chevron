import { PrismaClient } from "@prisma/client";
import {
  parseMeta,
  decisionData,
  countStatuses,
  notifyRequester,
  badRequest,
} from "./bookingHelpers.js";

const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════════
// Medical Bookings — โครงเดียวกับ Training Bookings
//   item = 1 คน — HR ยืนยันวันนัด / ปฏิเสธ รายคน
// ══════════════════════════════════════════════════════════

export async function createBatch(requestedById, items, meta) {
  // items: [{ employeeId, checkType?, clientName?, reason? }]
  const batch = await prisma.medicalRequestBatch.create({
    data: {
      requestedById: requestedById || null,
      ...parseMeta(meta),
      items: {
        create: items.map((i) => ({
          employeeId: i.employeeId,
          checkType: i.checkType || null,
          clientName: i.clientName || null,
          reason: i.reason || null,
        })),
      },
    },
    include: {
      items: {
        include: {
          employee: { select: { fullName: true, empCode: true } },
        },
      },
    },
  });

  const employeeCount = new Set(batch.items.map((i) => i.employeeId)).size;
  return { batch, employeeCount };
}

export async function getBatch(id) {
  const batch = await prisma.medicalRequestBatch.findUnique({
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
        },
      },
    },
  });
  if (!batch) {
    const err = new Error("Medical request not found");
    err.status = 404;
    throw err;
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
    employees: batch.items.map((item) => ({
      itemId: item.id,
      employeeId: item.employee.id,
      fullName: item.employee.fullName,
      empCode: item.employee.empCode,
      empId: item.employee.empId,
      position: item.employee.position?.name || null,
      clientName: item.clientName,
      checkType: item.checkType || "Medical Check up",
      reason: item.reason,
      status: item.status,
      confirmedStart: item.confirmedStart,
      confirmedEnd: item.confirmedEnd,
      confirmedProvider: item.confirmedProvider,
      hrNote: item.hrNote,
      decidedAt: item.decidedAt,
      decidedByName: item.decidedByName,
    })),
  };
}

export async function getAllBatches() {
  const batches = await prisma.medicalRequestBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      items: {
        select: { employeeId: true, clientName: true, status: true },
      },
    },
  });

  return batches.map((b) => {
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
      itemCount: b.items.length,
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
  return prisma.medicalRequestBatch.update({
    where: { id },
    data: { status },
  });
}

export async function decideItems(batchId, body, actor) {
  const itemIds = Array.isArray(body.itemIds) ? body.itemIds : [];
  if (itemIds.length === 0) throw badRequest("itemIds are required");
  const data = decisionData(body.decision, body, actor?.name);

  const batch = await prisma.medicalRequestBatch.findUnique({
    where: { id: batchId },
    select: { id: true, requestedById: true },
  });
  if (!batch) {
    const err = new Error("Medical request not found");
    err.status = 404;
    throw err;
  }

  const { count } = await prisma.medicalRequestItem.updateMany({
    where: { id: { in: itemIds }, batchId },
    data,
  });

  const stillPending = await prisma.medicalRequestItem.count({
    where: { batchId, status: "pending" },
  });
  await prisma.medicalRequestBatch.update({
    where: { id: batchId },
    data: { status: stillPending === 0 ? "completed" : "pending" },
  });

  if (body.decision !== "pending" && count > 0) {
    await notifyRequester(prisma, batch, actor?.id, {
      type: "medical_request_decision",
      title:
        body.decision === "confirmed"
          ? `HR ยืนยันวันตรวจสุขภาพแล้ว ${count} คน`
          : `HR ปฏิเสธคำขอตรวจสุขภาพ ${count} คน`,
      message: data.hrNote || null,
      link: `/medical-requests/${batchId}`,
    });
  }

  return getBatch(batchId);
}
