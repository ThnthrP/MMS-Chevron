import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedClients() {
  console.log("🚀 Seeding Clients...");

  const CLIENTS = [
    {
      name: "Chevron",
      shortName: "CHV",
      type: "offshore",
    },
  ];

  for (const client of CLIENTS) {
    await prisma.client.upsert({
      where: {
        name: client.name,
      },

      update: {
        shortName: client.shortName,
        type: client.type,
      },

      create: {
        name: client.name,
        shortName: client.shortName,
        type: client.type,
      },
    });

    console.log(`✔ ${client.name}`);
  }

  console.log(`✅ Done seeding Clients (${CLIENTS.length})`);
}

seedClients()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
