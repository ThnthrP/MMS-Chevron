import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getPositions() {
  return prisma.position.findMany({
    orderBy: {
      name: "asc",
    },
  });
}
