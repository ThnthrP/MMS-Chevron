// backend/prisma/seedClients.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ============================================================
// สร้าง Client + Contract (active) ให้ 3 client ที่เหลือ
// ── ไม่แตะ GlobalTraining/ClientTraining เลย ปลอดภัยรันได้ทันที ──
// ============================================================

const CLIENTS = [
  {
    name: "Erawan",
    shortName: "ER",
    type: "offshore",
    contract: {
      name: "Erawan Offshore 2025",
      type: "manpower_supply",
      matrixVersion: "Rev15",
      isActive: true,
    },
  },
  {
    name: "PTT",
    shortName: "PTT",
    type: "offshore",
    contract: {
      name: "PTT Offshore 2026",
      type: "manpower_supply",
      matrixVersion: "28-2-26",
      isActive: true,
    },
  },
  {
    name: "Valeura",
    shortName: "VAL",
    type: "offshore",
    contract: {
      name: "Valeura Offshore 2024",
      type: "manpower_supply",
      matrixVersion: "Review 01",
      isActive: true,
    },
  },
];

async function seed() {
  for (const c of CLIENTS) {
    const client = await prisma.client.upsert({
      where: { name: c.name },
      update: {},
      create: {
        name: c.name,
        shortName: c.shortName,
        type: c.type,
      },
    });

    const existingContract = await prisma.contract.findFirst({
      where: { clientId: client.id, isActive: true },
    });

    if (existingContract) {
      console.log(`⏭ ${c.name}: มี active contract อยู่แล้ว ข้าม`);
      continue;
    }

    await prisma.contract.create({
      data: {
        clientId: client.id,
        name: c.contract.name,
        type: c.contract.type,
        matrixVersion: c.contract.matrixVersion,
        isActive: c.contract.isActive,
      },
    });

    console.log(`✔ ${c.name} -> contract "${c.contract.name}" สร้างแล้ว`);
  }

  console.log("\n✅ Done seeding clients");
}

seed()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
