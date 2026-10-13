import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createBatch(requestedById, items) {
  // items: [{ employeeId, checkType?, clientName?, reason? }]
  const batch = await prisma.medicalRequestBatch.create({
    data: {
      requestedById: requestedById || null,
      items: { create: items },
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

  // ไม่ต้อง group ตาม training — flat list พอ เพราะ item มีแค่ "ขอตรวจ medical" อย่างเดียว
  return {
    id: batch.id,
    requestedByName: batch.requestedBy?.name || null,
    createdAt: batch.createdAt,
    employees: batch.items.map((item) => ({
      employeeId: item.employee.id,
      fullName: item.employee.fullName,
      empCode: item.employee.empCode,
      position: item.employee.position?.name || null,
      clientName: item.clientName,
      checkType: item.checkType || "Medical Check up",
      reason: item.reason,
    })),
  };
}

export async function getAllBatches() {
  const batches = await prisma.medicalRequestBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      items: {
        select: { employeeId: true, clientName: true },
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
