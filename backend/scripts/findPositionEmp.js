import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const positions = await prisma.position.findMany({
  where: {
    employees: {
      some: {},
    },
  },

  include: {
    _count: {
      select: {
        employees: true,
        requirements: true,
      },
    },
  },

  orderBy: {
    name: "asc",
  },
});

console.log("\n===== Positions with Employees =====");

positions.forEach((position) => {
  console.log(
    `${position.name} | Employees: ${position._count.employees} | Requirements: ${position._count.requirements}`,
  );
});
