import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getWorkers() {
  return prisma.employee.findMany({
    include: {
      position: true,
    },

    orderBy: {
      fullName: "asc",
    },
  });
}

export async function createWorker(data) {
  return prisma.employee.create({
    data: {
      empCode: data.empCode,
      fullName: data.fullName,

      positionId: data.positionId || null,

      division: data.division || null,

      startWorkDate: data.startWorkDate ? new Date(data.startWorkDate) : null,

      status: data.status,

      availabilityStatus: data.availabilityStatus,

      mobilizationStatus: data.mobilizationStatus,

      isOffshore: data.isOffshore,
    },
  });
}

export async function createPassport(employeeId, data) {
  return prisma.passport.create({
    data: {
      employeeId,

      passportNo: data.passportNo || null,

      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    },
  });
}

export async function getWorkerById(id) {
  return prisma.employee.findUnique({
    where: {
      id,
    },
    include: {
      position: true,
      passports: true,
      medicalRecords: true,
      trainingRecords: true,
    },
  });
}

export async function updateWorker(id, data) {
  return prisma.employee.update({
    where: {
      id,
    },
    data,
  });
}

export async function deleteWorker(id) {
  return prisma.employee.update({
    where: {
      id: String(id),
    },
    data: {
      status: "inactive",
    },
  });
}
