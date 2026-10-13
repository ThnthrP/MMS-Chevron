import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════
// TRAINING SOURCE OPTIONS — user เพิ่ม/ลบเองได้ (แทน enum เดิม)
// ════════════════════════════════════════════════════════════════
export async function listTrainingSources() {
  return prisma.trainingSourceOption.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { trainingStandards: true } },
    },
  });
}

export async function createTrainingSource({ name, requiresClient }) {
  try {
    return await prisma.trainingSourceOption.create({
      data: { name: name.trim(), requiresClient: !!requiresClient },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error(`มี source ชื่อ "${name}" อยู่แล้ว`);
      err.status = 400;
      throw err;
    }
    throw error;
  }
}

export async function deleteTrainingSource(id) {
  const count = await prisma.trainingStandard.count({
    where: { sourceId: id },
  });
  if (count > 0) {
    const err = new Error(
      `ลบไม่ได้ — source นี้ถูกใช้อยู่ใน ${count} training standard`,
    );
    err.status = 400;
    throw err;
  }
  return prisma.trainingSourceOption.delete({ where: { id } });
}

// ════════════════════════════════════════════════════════════════
// GET — list ทั้งหมด (รองรับ search by name/fullName) + จำนวน standards
//        + summary ของ standard แรก (สำหรับแสดงคอลัมน์ในตาราง)
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
          employeeTrainings: { where: { isLatest: true } },
        },
      },
      trainingStandards: {
        take: 1,
        orderBy: { createdAt: "asc" },
        include: { source: true },
      },
      clientTrainings: {
        select: {
          contract: {
            select: { client: { select: { id: true, name: true } } },
          },
          _count: { select: { requirements: true } },
        },
      },
    },
  });

  return trainings.map((t) => {
    const std = t.trainingStandards[0];
    const { trainingStandards, clientTrainings, ...rest } = t;
    return {
      ...rest,
      standard: std
        ? {
            id: std.id,
            sourceName: std.source.name,
            trainingHours: std.trainingHours,
            validityDays: std.validityDays,
            isNoExpiry: std.isNoExpiry,
          }
        : null,
      // ← เปลี่ยนจาก array ของ string เป็น array ของ object
      clientUsage: clientTrainings.map((ct) => ({
        name: ct.contract.client.name,
        positionCount: ct._count.requirements,
      })),
    };
  });
}

// ════════════════════════════════════════════════════════════════
// GET — detail 1 ตัว พร้อม trainingStandards (+ source + client + จำนวน contract ที่ใช้ standard นั้นอยู่)
// ════════════════════════════════════════════════════════════════
export async function getGlobalTrainingDetail(id) {
  const training = await prisma.globalTraining.findUnique({
    where: { id },
    include: {
      trainingStandards: {
        include: {
          source: true,
          client: { select: { id: true, name: true } },
          _count: { select: { clientTrainings: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      // ← เพิ่มใหม่
      clientTrainings: {
        select: {
          id: true,
          trainingStandardId: true,
          contract: {
            select: { id: true, client: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!training) return null;

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
//   sourceId แทน source enum เดิม — clientId บังคับก็ต่อเมื่อ source นั้น requiresClient = true
// ════════════════════════════════════════════════════════════════
export async function createTrainingStandard(globalTrainingId, data) {
  const sourceOption = await prisma.trainingSourceOption.findUnique({
    where: { id: data.sourceId },
  });
  if (!sourceOption) {
    const err = new Error("ไม่พบ source ที่เลือก");
    err.status = 400;
    throw err;
  }
  if (sourceOption.requiresClient && !data.clientId) {
    const err = new Error(
      `source "${sourceOption.name}" ต้องเลือก client ด้วย`,
    );
    err.status = 400;
    throw err;
  }

  try {
    return await prisma.trainingStandard.create({
      data: {
        globalTrainingId,
        sourceId: data.sourceId,
        clientId: sourceOption.requiresClient ? data.clientId || null : null,
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
  const sourceOption = await prisma.trainingSourceOption.findUnique({
    where: { id: data.sourceId },
  });
  if (!sourceOption) {
    const err = new Error("ไม่พบ source ที่เลือก");
    err.status = 400;
    throw err;
  }
  if (sourceOption.requiresClient && !data.clientId) {
    const err = new Error(
      `source "${sourceOption.name}" ต้องเลือก client ด้วย`,
    );
    err.status = 400;
    throw err;
  }

  try {
    return await prisma.trainingStandard.update({
      where: { id: standardId },
      data: {
        sourceId: data.sourceId,
        clientId: sourceOption.requiresClient ? data.clientId || null : null,
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
