import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════
// GET — list ทั้งหมด (รองรับ search by name/fullName) + จำนวน standards
// ════════════════════════════════════════════════════════════════
export async function listGlobalTrainings(search) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const trainings = await prisma.globalTraining.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          trainingStandards: true,
          employeeTrainings: {
            where: { isLatest: true }, // ← นับเฉพาะ record ล่าสุด กันนับซ้ำ
          },
        },
      },
    },
  });
  return trainings;
}

// ════════════════════════════════════════════════════════════════
// GET — detail 1 ตัว พร้อม trainingStandards (+ client + จำนวน contract ที่ใช้ standard นั้นอยู่)
// ════════════════════════════════════════════════════════════════
export async function getGlobalTrainingDetail(id) {
  const training = await prisma.globalTraining.findUnique({
    where: { id },
    include: {
      trainingStandards: {
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { clientTrainings: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!training) return null;

  // แนบ _clientTrainingCount ต่อ standard ให้ frontend ใช้ guard ตอนลบ
  return {
    ...training,
    trainingStandards: training.trainingStandards.map((std) => ({
      ...std,
      _clientTrainingCount: std._count.clientTrainings,
    })),
  };
}

// ════════════════════════════════════════════════════════════════
// POST — สร้าง GlobalTraining ใหม่
// ════════════════════════════════════════════════════════════════
export async function createGlobalTraining({ name, fullName, description }) {
  return prisma.globalTraining.create({
    data: { name, fullName, description },
  });
}

// ════════════════════════════════════════════════════════════════
// PUT — แก้ไข GlobalTraining
// ════════════════════════════════════════════════════════════════
export async function updateGlobalTraining(
  id,
  { name, fullName, description },
) {
  return prisma.globalTraining.update({
    where: { id },
    data: { name, fullName, description },
  });
}

// ════════════════════════════════════════════════════════════════
// DELETE — ลบ GlobalTraining (guard: ต้องไม่มี trainingStandards ผูกอยู่)
// ════════════════════════════════════════════════════════════════
export async function deleteGlobalTraining(id) {
  const count = await prisma.trainingStandard.count({
    where: { globalTrainingId: id },
  });
  if (count > 0) {
    const err = new Error(
      `ลบไม่ได้ — มี ${count} training standard ผูกอยู่ กรุณาลบ standard ทั้งหมดก่อน`,
    );
    err.status = 400;
    throw err;
  }
  return prisma.globalTraining.delete({ where: { id } });
}

// ════════════════════════════════════════════════════════════════
// POST — สร้าง TrainingStandard ใหม่ ผูกกับ GlobalTraining
//   guard: unique [globalTrainingId, source, clientId] (Prisma จะ throw เองถ้าซ้ำ
//   แต่ดัก error P2002 ให้ message อ่านง่ายกว่า)
// ════════════════════════════════════════════════════════════════
export async function createTrainingStandard(globalTrainingId, data) {
  try {
    return await prisma.trainingStandard.create({
      data: {
        globalTrainingId,
        source: data.source,
        clientId: data.source === "COMPANY" ? data.clientId || null : null,
        trainingHours: data.trainingHours,
        validityDays: data.isNoExpiry ? null : data.validityDays,
        isNoExpiry: data.isNoExpiry,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error(
        "มี standard สำหรับ source นี้ (และ client นี้ถ้ามี) อยู่แล้ว — แก้ standard เดิมแทนการสร้างซ้ำ",
      );
      err.status = 400;
      throw err;
    }
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// PUT — แก้ไข TrainingStandard
// ════════════════════════════════════════════════════════════════
export async function updateTrainingStandard(standardId, data) {
  try {
    return await prisma.trainingStandard.update({
      where: { id: standardId },
      data: {
        source: data.source,
        clientId: data.source === "COMPANY" ? data.clientId || null : null,
        trainingHours: data.trainingHours,
        validityDays: data.isNoExpiry ? null : data.validityDays,
        isNoExpiry: data.isNoExpiry,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error(
        "มี standard สำหรับ source นี้ (และ client นี้ถ้ามี) อยู่แล้ว — แก้ standard เดิมแทนการสร้างซ้ำ",
      );
      err.status = 400;
      throw err;
    }
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// DELETE — ลบ TrainingStandard (guard: ต้องไม่มี ClientTraining ผูกอยู่)
// ════════════════════════════════════════════════════════════════
export async function deleteTrainingStandard(standardId) {
  const count = await prisma.clientTraining.count({
    where: { trainingStandardId: standardId },
  });
  if (count > 0) {
    const err = new Error(
      `ลบไม่ได้ — standard นี้ถูกใช้อยู่ใน ${count} contract`,
    );
    err.status = 400;
    throw err;
  }
  return prisma.trainingStandard.delete({ where: { id: standardId } });
}
