import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function banEmployee({
  employeeId,
  durationMonths,
  customUntil,
  reason,
  reasonNote,
  bannedById,
  sourceTaskId,
}) {
  let bannedUntil;
  let finalDurationMonths;

  if (customUntil) {
    bannedUntil = new Date(customUntil);
    const now = new Date();
    finalDurationMonths = Math.round(
      (bannedUntil - now) / (1000 * 60 * 60 * 24 * 30.44),
    ); // ประมาณจำนวนเดือน
  } else {
    finalDurationMonths = durationMonths || 3;
    bannedUntil = new Date();
    bannedUntil.setMonth(bannedUntil.getMonth() + finalDurationMonths);
  }

  await prisma.employeeBan.updateMany({
    where: { employeeId, isActive: true },
    data: {
      isActive: false,
      liftedAt: new Date(),
      liftReason: "superseded_by_new_ban",
    },
  });

  return prisma.employeeBan.create({
    data: {
      employeeId,
      reason: reason || "drug_test_fail",
      reasonNote: reasonNote || null,
      durationMonths: finalDurationMonths, // ← ไม่มีทาง null แล้ว
      bannedUntil,
      bannedById: bannedById || null,
      sourceTaskId: sourceTaskId || null,
    },
  });
}

export async function liftBan(banId, { liftedById, liftReason }) {
  return prisma.employeeBan.update({
    where: { id: banId },
    data: {
      isActive: false,
      liftedAt: new Date(),
      liftedById: liftedById || null,
      liftReason: liftReason || null,
    },
  });
}

export async function getActiveBan(employeeId) {
  return prisma.employeeBan.findFirst({
    where: {
      employeeId,
      isActive: true,
      bannedUntil: { gt: new Date() },
    },
    orderBy: { bannedFrom: "desc" },
  });
}

export async function getBanHistory(employeeId) {
  return prisma.employeeBan.findMany({
    where: { employeeId },
    orderBy: { bannedFrom: "desc" },
    include: {
      bannedBy: { select: { name: true } },
      liftedBy: { select: { name: true } },
    },
  });
}

// ── ใช้ใน allocationService.js/mobilizationService.js เพื่อกรองคน active ban ออก ──
export async function getActiveBanMap(employeeIds) {
  if (!employeeIds?.length) return new Map();
  const bans = await prisma.employeeBan.findMany({
    where: {
      employeeId: { in: employeeIds },
      isActive: true,
      bannedUntil: { gt: new Date() },
    },
  });
  return new Map(bans.map((b) => [b.employeeId, b]));
}
