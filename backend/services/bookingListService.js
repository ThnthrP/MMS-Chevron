import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════════
// รายการรายคน สำหรับหน้า Training Bookings / Medical Bookings
//   1 แถว = 1 item (คน × training หรือ คน × การตรวจ) จากทุกคำขอ
//   HR ยืนยัน / ปฏิเสธ จากหน้ารายการได้เลย (ใช้ PATCH /:batchId/items เดิม)
// ══════════════════════════════════════════════════════════

const EMPLOYEE_SELECT = {
  id: true,
  fullName: true,
  fullNameTH: true,
  fullNameEN: true,
  empCode: true,
  empId: true,
  position: { select: { name: true } },
};

const BATCH_SELECT = {
  id: true,
  createdAt: true,
  requestedStart: true,
  requestedEnd: true,
  provider: true,
  remarks: true,
  requestedBy: { select: { name: true } },
};

const baseRow = (item) => ({
  itemId: item.id,
  batchId: item.batch.id,
  employeeId: item.employee.id,
  fullName: item.employee.fullName,
  fullNameTH: item.employee.fullNameTH,
  fullNameEN: item.employee.fullNameEN,
  empCode: item.employee.empCode,
  empId: item.employee.empId,
  position: item.employee.position?.name || null,
  clientName: item.clientName,
  status: item.status || "pending",
  confirmedStart: item.confirmedStart,
  confirmedEnd: item.confirmedEnd,
  confirmedProvider: item.confirmedProvider,
  hrNote: item.hrNote,
  decidedAt: item.decidedAt,
  decidedByName: item.decidedByName,
  // ข้อมูลจากคำขอ (batch)
  createdAt: item.batch.createdAt,
  requestedByName: item.batch.requestedBy?.name || null,
  requestedStart: item.batch.requestedStart,
  requestedEnd: item.batch.requestedEnd,
  provider: item.batch.provider,
  remarks: item.batch.remarks,
});

export async function getTrainingItems() {
  const items = await prisma.trainingRequestItem.findMany({
    orderBy: { batch: { createdAt: "desc" } },
    include: {
      employee: { select: EMPLOYEE_SELECT },
      globalTraining: { select: { id: true, name: true } },
      batch: { select: BATCH_SELECT },
    },
  });
  return items.map((item) => ({
    ...baseRow(item),
    trainingId: item.globalTraining.id,
    trainingName: item.globalTraining.name,
  }));
}

export async function getMedicalItems() {
  const items = await prisma.medicalRequestItem.findMany({
    orderBy: { batch: { createdAt: "desc" } },
    include: {
      employee: { select: EMPLOYEE_SELECT },
      batch: { select: BATCH_SELECT },
    },
  });
  return items.map((item) => ({
    ...baseRow(item),
    checkType: item.checkType || "Medical Check up",
    reason: item.reason,
  }));
}

// คนที่มีคำขอตรวจสุขภาพรอ HR อยู่ — หน้า Compliance ใช้แสดง "✓ แจ้งแล้ว"
// คืน ["<employeeId>:<checkType>", ...]
export async function getPendingMedicalKeys() {
  const items = await prisma.medicalRequestItem.findMany({
    where: { status: "pending" },
    select: { employeeId: true, checkType: true },
  });
  return [
    ...new Set(items.map((i) => `${i.employeeId}:${i.checkType || "Medical Check up"}`)),
  ];
}
