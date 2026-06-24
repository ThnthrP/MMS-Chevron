import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getClients() {
  return prisma.client.findMany({
    include: {
      contracts: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });
}
