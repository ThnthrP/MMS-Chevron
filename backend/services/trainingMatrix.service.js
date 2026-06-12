import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getContracts() {
  return prisma.contract.findMany({
    where: {
      isActive: true,
    },

    orderBy: {
      name: "asc",
    },

    select: {
      id: true,
      name: true,
      contractNo: true,
    },
  });
}

export async function getPositionsByContract(contractId) {
  return prisma.position.findMany({
    where: {
      requirements: {
        some: {
          contractId,
        },
      },
    },

    orderBy: {
      name: "asc",
    },

    select: {
      id: true,
      name: true,
    },
  });
}

export async function getRequirements(contractId, positionId) {
  const rows = await prisma.positionRequirement.findMany({
    where: {
      contractId,

      ...(positionId ? { positionId } : {}),
    },

    include: {
      position: true,

      clientTraining: {
        include: {
          globalTraining: true,
        },
      },
    },

    orderBy: [
      {
        position: {
          name: "asc",
        },
      },
    ],
  });

  // ===================================
  // Group by Position
  // ===================================

  const groups = {};

  for (const row of rows) {
    const pid = row.position.id;

    if (!groups[pid]) {
      groups[pid] = {
        positionId: row.position.id,

        positionName: row.position.name,

        requirements: [],
      };
    }

    groups[pid].requirements.push({
      id: row.id,

      trainingName: row.clientTraining.globalTraining.name,

      requirementType: row.requirementType,

      sourceMatrixCode: row.sourceMatrixCode,
    });
  }

  return Object.values(groups);
}

  // ===================================
  // Global Training
  // ===================================

export async function getGlobalTrainings() {
  return prisma.globalTraining.findMany({
    orderBy: {
      name: "asc",
    },

    select: {
      id: true,
      name: true,
      fullName: true,
    },
  });
}
