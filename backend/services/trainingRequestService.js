import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createBatch(requestedById, items) {
  // items: [{ employeeId, globalTrainingId, clientName }]
  const batch = await prisma.trainingRequestBatch.create({
    data: {
      requestedById: requestedById || null,
      items: { create: items },
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
      employeeId: item.employee.id,
      fullName: item.employee.fullName,
      empCode: item.employee.empCode,
      position: item.employee.position?.name || null,
      clientName: item.clientName,
    });
  }

  return {
    id: batch.id,
    requestedByName: batch.requestedBy?.name || null,
    createdAt: batch.createdAt,
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
          clientName: true, // ← เพิ่ม
          globalTraining: { select: { name: true } }, // ← เพิ่ม
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
      employeeCount: new Set(b.items.map((i) => i.employeeId)).size,
      trainingCount: new Set(b.items.map((i) => i.globalTrainingId)).size,
      itemCount: b.items.length,
      trainingNames, // ← เพิ่ม เช่น ["Basic First Aid", "H2S Awareness"]
      clientNames, // ← เพิ่ม เช่น ["Chevron", "PTTEP"]
    };
  });
}
