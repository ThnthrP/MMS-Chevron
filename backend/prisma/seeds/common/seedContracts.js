import { PrismaClient, ContractType } from "@prisma/client";

const prisma = new PrismaClient();

async function seedContracts() {
  console.log("🚀 Seeding Contracts...");

  const erawan = await prisma.client.findUnique({
    where: { name: "Erawan" },
  });

  const chevron = await prisma.client.findUnique({
    where: { name: "Chevron" },
  });

  const ptt = await prisma.client.findUnique({
    where: { name: "PTT" },
  });

  const valeura = await prisma.client.findUnique({
    where: { name: "Valeura" },
  });

  if (!erawan || !chevron || !ptt || !valeura) {
    throw new Error("Some clients not found");
  }

  const CONTRACTS = [
    {
      name: "Erawan Offshore 2026",
      contractNo: "ER-2026",
      clientId: erawan.id,
      type: ContractType.manpower_supply,
    },

    {
      name: "Chevron Matrix 2025",
      contractNo: "CHV-2025",
      clientId: chevron.id,
      type: ContractType.manpower_supply,
    },

    {
      name: "PTT Matrix 2025",
      contractNo: "PTT-2025",
      clientId: ptt.id,
      type: ContractType.manpower_supply,
    },

    {
      name: "Valeura Matrix 2024",
      contractNo: "VAL-2024",
      clientId: valeura.id,
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
