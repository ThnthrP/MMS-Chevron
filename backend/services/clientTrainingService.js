import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// global training ที่ "ยังไม่ถูก link" เข้า contract นี้ — สำหรับ dropdown ค้นหาตอนกด "+ Link Training"
export async function getAvailableGlobalTrainings(contractId, search) {
  const linked = await prisma.clientTraining.findMany({
    where: { contractId },
    select: { globalTrainingId: true },
  });
  const linkedIds = linked.map((c) => c.globalTrainingId);

  return prisma.globalTraining.findMany({
    where: {
      id: { notIn: linkedIds },
      trainingStandards: { some: {} }, // ต้องมี standard อย่างน้อย 1 ก่อนถึง link ได้
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { fullName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      trainingStandards: {
        select: {
          id: true,
          source: { select: { name: true } },
          client: { select: { name: true } },
        },
      },
    },
  });
}

// สร้าง (หรืออัปเดตถ้ามีอยู่แล้ว) ClientTraining — แทนที่การพึ่ง seed script
export async function linkGlobalTraining(
  contractId,
  globalTrainingId,
  trainingStandardId,
  nameAlias,
) {
  const standard = await prisma.trainingStandard.findUnique({
    where: { id: trainingStandardId },
  });
  if (!standard || standard.globalTrainingId !== globalTrainingId) {
    const err = new Error(
      "Training standard ไม่ตรงกับ global training ที่เลือก",
    );
    err.status = 400;
    throw err;
  }

  return prisma.clientTraining.upsert({
    where: {
      globalTrainingId_contractId: { globalTrainingId, contractId },
    },
    update: { trainingStandardId, nameAlias: nameAlias || null },
    create: {
      contractId,
      globalTrainingId,
      trainingStandardId,
      nameAlias: nameAlias || null,
    },
  });
}

// ลบ ClientTraining — guard ถ้าถูกใช้เป็น requirement อยู่ในบาง position แล้ว
// ลบ ClientTraining — guard ทั้ง PositionRequirement (matrix) และ EmployeeTraining (record พนักงานจริง)
export async function unlinkClientTraining(clientTrainingId) {
  const requirementCount = await prisma.positionRequirement.count({
    where: { clientTrainingId },
  });
  if (requirementCount > 0) {
    const err = new Error(
      `ลบไม่ได้ — training นี้ถูกตั้งเป็น requirement อยู่ใน ${requirementCount} position กรุณาเอาออกจาก matrix ก่อน`,
    );
    err.status = 400;
    throw err;
  }

  // ← เพิ่มใหม่: กันลบทิ้งพนักงานที่เคยมี record ผูกกับ client นี้อยู่
  const employeeTrainingCount = await prisma.employeeTraining.count({
    where: { clientTrainingId },
  });
  if (employeeTrainingCount > 0) {
    const err = new Error(
      `ลบไม่ได้ — มี employee training record ${employeeTrainingCount} รายการผูกกับ client นี้อยู่ (import ไปแล้ว)`,
    );
    err.status = 400;
    throw err;
  }

  return prisma.clientTraining.delete({ where: { id: clientTrainingId } });
}
