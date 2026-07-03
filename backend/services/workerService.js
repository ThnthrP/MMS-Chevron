import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── helper: แปลง roster fields ให้ปลอดภัย (ใช้ทั้ง create/update) ──
// คืนเฉพาะ key ที่ "ส่งมาใน body" เพื่อไม่เผลอทับค่าเดิมด้วย null ตอน update
function buildRosterData(data) {
  const out = {};
  if ("birthDate" in data)
    out.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  if ("isPermanent" in data) out.isPermanent = !!data.isPermanent;
  if ("healthRisk" in data) out.healthRisk = data.healthRisk || null;
  if ("healthNote" in data) out.healthNote = data.healthNote || null;
  if ("sseLevel" in data) out.sseLevel = data.sseLevel || null;
  if ("sseCompleted" in data)
    out.sseCompleted =
      data.sseCompleted === null || data.sseCompleted === undefined
        ? null
        : !!data.sseCompleted;
  return out;
}

// ── helper: หาเลข EXPT สูงสุดใน DB ──
async function computeNextExptNumber() {
  const emps = await prisma.employee.findMany({
    where: { empCode: { startsWith: "EXPT-" } },
    select: { empCode: true },
  });
  let max = 0;
  for (const e of emps) {
    const m = /^EXPT-(\d+)$/.exec(e.empCode || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function formatEmpCode(n) {
  return `EXPT-${String(n).padStart(3, "0")}`;
}

// ── ส่งรหัส EXPT ถัดไปให้ frontend แสดงในฟอร์ม ──
export async function getNextEmpCode() {
  const next = await computeNextExptNumber();
  return formatEmpCode(next);
}

// ============================================================
// Cert matching → mobilizationStatus / availabilityStatus
// ============================================================
// เกณฑ์ mobilizationStatus = "ready" ต้องผ่านทั้ง 2 เงื่อนไข:
//   1) match กับ training matrix ของ "Chevron" ครบ 100%
//   2) ไม่มี training หรือ medical check ใบไหนหมดอายุแล้ว
//      (เช็คทุกใบที่มี expiryDate — เหมือนที่ ComplianceDashboard/
//       complianceService นับ "expired", ไม่ใช่แค่ตัวที่ required ใน matrix)
//   ไม่ผ่านข้อใดข้อหนึ่ง → mobilizationStatus = "pending"
//   ตำแหน่งที่ไม่มี matrix (ไม่มี PositionRequirement เลย) → ไม่แตะสถานะเดิม
//   ถ้า mobilizationStatus ปัจจุบันเป็น "on_site" → ไม่ auto-overwrite
//     (on_site มาจาก flow มือ/มือถือหน้างาน ไม่ใช่ผลจาก cert matching)
// availabilityStatus derive จาก mobilizationStatus:
//   pending / ready → available
//   on_site         → unavailable
// ============================================================

const PRIMARY_CLIENT_NAME = "Chevron";

// คืน { required, completed, score, hasExpiredCert } หรือ null ถ้าคำนวณไม่ได้
// (ไม่มีตำแหน่ง / ไม่มี matrix ของตำแหน่งนั้น)
export async function computeMatchPercent(employeeId) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      trainings: {
        where: { isLatest: true },
        select: { globalTrainingId: true, expiryDate: true },
      },
      medicalChecks: {
        select: { expiryDate: true },
      },
    },
  });

  if (!employee || !employee.positionId) return null;

  const client = await prisma.client.findFirst({
    where: { name: PRIMARY_CLIENT_NAME },
  });
  if (!client) return null;

  const contract = await prisma.contract.findFirst({
    where: { clientId: client.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!contract) return null;

  const requirements = await prisma.positionRequirement.findMany({
    where: { positionId: employee.positionId, contractId: contract.id },
    include: { clientTraining: { select: { globalTrainingId: true } } },
  });

  if (requirements.length === 0) return null; // ไม่มี matrix ของตำแหน่งนี้

  const requiredIds = new Set(
    requirements.map((r) => r.clientTraining.globalTrainingId),
  );
  const completedIds = new Set(
    employee.trainings.map((t) => t.globalTrainingId).filter(Boolean),
  );

  const required = requiredIds.size;
  const completed = [...requiredIds].filter((id) =>
    completedIds.has(id),
  ).length;
  const score = required > 0 ? Math.round((completed / required) * 100) : 0;

  // เช็คใบหมดอายุ — ทุกใบที่มี expiryDate ทั้ง training และ medical
  // (ไม่นับใบที่ expiryDate = null เพราะแปลว่าไม่มีวันหมดอายุ)
  const now = new Date();
  const hasExpiredCert =
    employee.trainings.some(
      (t) => t.expiryDate && new Date(t.expiryDate) < now,
    ) ||
    employee.medicalChecks.some(
      (m) => m.expiryDate && new Date(m.expiryDate) < now,
    );

  return { required, completed, score, hasExpiredCert };
}

// คำนวณแล้ว update mobilizationStatus + availabilityStatus ให้ employee คนเดียว
// เรียกใช้ได้ตรงๆ (batch script) หรือถูกเรียกอัตโนมัติจาก hook ด้านล่าง
export async function recomputeMobilizationAndAvailability(employeeId) {
  const current = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { mobilizationStatus: true },
  });
  if (!current) return;

  // on_site = ลงพื้นที่จริงแล้ว → ไม่ให้ cert matching ทับสถานะนี้อัตโนมัติ
  if (current.mobilizationStatus === "on_site") return;

  const match = await computeMatchPercent(employeeId);
  if (!match) return; // ไม่มีตำแหน่ง/ไม่มี matrix → คงสถานะเดิมไว้

  const mobilizationStatus =
    match.score === 100 && !match.hasExpiredCert ? "ready" : "pending";
  const availabilityStatus = "available"; // pending/ready ทั้งคู่ = available

  await prisma.employee.update({
    where: { id: employeeId },
    data: { mobilizationStatus, availabilityStatus },
  });
}

export async function getWorkers() {
  return prisma.employee.findMany({
    include: { position: true },
    orderBy: { fullName: "asc" },
  });
}

export async function getWorkerById(id) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      position: true,
      passport: true,
      medicalChecks: true,
      trainings: {
        where: { isLatest: true },
        include: { globalTraining: true },
      },
    },
  });
}

export async function createWorker(data) {
  let empCode = (data.empCode || "").trim();
  if (!empCode) {
    empCode = formatEmpCode(await computeNextExptNumber());
  }

  const buildData = (code) => ({
    empCode: code,
    fullName: data.fullName,
    nationality: data.nationality || null,
    phone: data.phone || null,
    email: data.email || null,
    notes: data.notes || null,
    positionId: data.positionId || null,
    division: data.division || null,
    startWorkDate: data.startWorkDate ? new Date(data.startWorkDate) : null,
    status: data.status || "active",
    availabilityStatus: data.availabilityStatus || "available",
    mobilizationStatus: data.mobilizationStatus || "pending",
    isOffshore: data.isOffshore || false,
    ...buildRosterData(data),
  });

  const MAX_RETRY = 5;
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      return await prisma.employee.create({ data: buildData(empCode) });
    } catch (error) {
      const isEmpCodeClash =
        error.code === "P2002" &&
        (error.meta?.target?.includes?.("empCode") ||
          error.meta?.target?.[0] === "empCode");

      if (isEmpCodeClash && /^EXPT-\d+$/.test(empCode)) {
        empCode = formatEmpCode(await computeNextExptNumber());
        continue;
      }
      throw error;
    }
  }

  throw new Error("ไม่สามารถสร้างรหัสพนักงานที่ไม่ซ้ำได้ กรุณาลองอีกครั้ง");
}

// upsert เพราะ Passport ผูกกับ employee 1-to-1
export async function createPassport(employeeId, data) {
  return prisma.passport.upsert({
    where: { employeeId },
    update: {
      passportNo: data.passportNo || null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      workPermitNo: data.workPermitNo || null,
      workPermitExpiryDate: data.workPermitExpiryDate
        ? new Date(data.workPermitExpiryDate)
        : null,
    },
    create: {
      employeeId,
      passportNo: data.passportNo || null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      workPermitNo: data.workPermitNo || null,
      workPermitExpiryDate: data.workPermitExpiryDate
        ? new Date(data.workPermitExpiryDate)
        : null,
    },
  });
}

export async function createTraining(employeeId, data) {
  const result = await prisma.employeeTraining.create({
    data: {
      employeeId,
      globalTrainingId: data.globalTrainingId || null,
      completedDate: data.completedDate ? new Date(data.completedDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      status: "completed",
      source: data.source || "manual",
      isLatest: true,
      version: 1,
    },
  });
  await recomputeMobilizationAndAvailability(employeeId);
  return result;
}

export async function updateTraining(trainingId, data) {
  const result = await prisma.employeeTraining.update({
    where: { id: trainingId },
    data: {
      globalTrainingId: data.globalTrainingId || null,
      completedDate: data.completedDate ? new Date(data.completedDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    },
  });
  await recomputeMobilizationAndAvailability(result.employeeId);
  return result;
}

export async function deleteTraining(trainingId) {
  const existing = await prisma.employeeTraining.findUnique({
    where: { id: trainingId },
    select: { employeeId: true },
  });
  const result = await prisma.employeeTraining.delete({
    where: { id: trainingId },
  });
  if (existing) {
    await recomputeMobilizationAndAvailability(existing.employeeId);
  }
  return result;
}

export async function createMedical(employeeId, data) {
  return prisma.medicalCheck.create({
    data: {
      employeeId,
      checkType: data.checkType || "Medical Check up",
      hospital: data.hospital || null,
      issuedDate: data.issuedDate ? new Date(data.issuedDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      status: data.status || "pending",
      notes: data.notes || null,
    },
  });
}

export async function updateMedical(medicalId, data) {
  return prisma.medicalCheck.update({
    where: { id: medicalId },
    data: {
      checkType: data.checkType || "Medical Check up",
      hospital: data.hospital || null,
      issuedDate: data.issuedDate ? new Date(data.issuedDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      status: data.status || "pending",
      notes: data.notes || null,
    },
  });
}

export async function updateWorker(id, data) {
  const result = await prisma.employee.update({
    where: { id },
    data: {
      empCode: data.empCode,
      fullName: data.fullName,
      nationality: data.nationality || null,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
      positionId: data.positionId || null,
      division: data.division || null,
      startWorkDate: data.startWorkDate ? new Date(data.startWorkDate) : null,
      status: data.status || "active",
      availabilityStatus: data.availabilityStatus || "available",
      mobilizationStatus: data.mobilizationStatus || "pending",
      isOffshore: data.isOffshore || false,
      ...buildRosterData(data),
    },
  });
  // ตำแหน่งอาจเปลี่ยน → matrix ที่ใช้เทียบเปลี่ยนตาม ต้องคำนวณสถานะใหม่
  await recomputeMobilizationAndAvailability(id);
  return result;
}

export async function deleteWorker(id) {
  return prisma.employee.update({
    where: { id: String(id) },
    data: { status: "inactive" },
  });
}

export async function getDivisions() {
  const rows = await prisma.employee.findMany({
    where: { division: { not: null } },
    distinct: ["division"],
    select: { division: true },
    orderBy: { division: "asc" },
  });
  return rows.map((r) => r.division).filter(Boolean);
}
