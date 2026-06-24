import { PrismaClient, ContractType } from "@prisma/client";

const prisma = new PrismaClient();

async function seedContracts() {
  console.log("🚀 Seeding Contracts...");

  const chevron = await prisma.client.findUnique({
    where: { name: "Chevron" },
  });

  if (!chevron) {
    throw new Error("Chevron client not found");
  }

  const CONTRACTS = [
    {
      name: "Chevron Matrix 2025",
      contractNo: "CHV-2025",
      clientId: chevron.id,
      type: ContractType.manpower_supply,
    },
  ];

  for (const contract of CONTRACTS) {
    await prisma.contract.upsert({
      where: {
        clientId_contractNo: {
          clientId: contract.clientId,
          contractNo: contract.contractNo,
        },
      },

      update: {
        name: contract.name,
        type: contract.type,
      },

      create: {
        ...contract,
        isActive: true,
      },
    });

    console.log(`✔ ${contract.name}`);
  }

  console.log(`✅ Done seeding Contracts (${CONTRACTS.length})`);
}

seedContracts()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
