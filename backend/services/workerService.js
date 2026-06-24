import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── helper: แปลง roster fields ให้ปลอดภัย (ใช้ทั้ง create/update) ──
// คืนเฉพาะ key ที่ "ส่งมาใน body" เพื่อไม่เผลอทับค่าเดิมด้วย null ตอน update
function buildRosterData(data) {
  const out = {};
  if ("birthDate" in data)
    out.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  if ("isPermanent" in data) out.isPermanent = !!data.isPermanent;
  if ("healthRisk" in data) out.healthRisk = data.healthRisk || null; // low|medium|high|null
  if ("healthNote" in data) out.healthNote = data.healthNote || null;
  if ("sseLevel" in data) out.sseLevel = data.sseLevel || null; // new_sse|sse1|sse2|null
  if ("sseCompleted" in data)
    out.sseCompleted =
      data.sseCompleted === null || data.sseCompleted === undefined
        ? null
        : !!data.sseCompleted;
  return out;
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
  return prisma.employee.create({
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
      ...buildRosterData(data), // birthDate / isPermanent / healthRisk / healthNote / sseLevel / sseCompleted
    },
  });
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
  return prisma.employeeTraining.create({
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
}

// อัปเดต training record เดิม (ตาม id)
export async function updateTraining(trainingId, data) {
  return prisma.employeeTraining.update({
    where: { id: trainingId },
    data: {
      globalTrainingId: data.globalTrainingId || null,
      completedDate: data.completedDate ? new Date(data.completedDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    },
  });
}

export async function deleteTraining(trainingId) {
  return prisma.employeeTraining.delete({
    where: { id: trainingId },
  });
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

// อัปเดต medical record เดิม (ตาม id)
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
  return prisma.employee.update({
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
      ...buildRosterData(data), // birthDate / isPermanent / healthRisk / healthNote / sseLevel / sseCompleted
    },
  });
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
  return rows.map((r) => r.division).filter(Boolean); // filter ตัด "" ทิ้งด้วย
}
