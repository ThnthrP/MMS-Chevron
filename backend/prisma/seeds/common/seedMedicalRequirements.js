import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedMedicalRequirements() {
  console.log("🚀 Seeding Medical Requirements...");

  // ======================================================
  // Clients
  // ======================================================

  const erawan = await prisma.client.findUnique({
    where: {
      name: "Erawan",
    },
  });

  const chevron = await prisma.client.findUnique({
    where: {
      name: "Chevron",
    },
  });

  const ptt = await prisma.client.findUnique({
    where: {
      name: "PTT",
    },
  });

  const valeura = await prisma.client.findUnique({
    where: {
      name: "Valeura",
    },
  });

  // ======================================================
  // Validate
  // ======================================================

  if (!erawan) {
    throw new Error("Client not found: Erawan");
  }

  if (!chevron) {
    throw new Error("Client not found: Chevron");
  }

  if (!ptt) {
    throw new Error("Client not found: PTT");
  }

  if (!valeura) {
    throw new Error("Client not found: Valeura");
  }

  // ======================================================
  // Requirements
  // ======================================================

  const REQUIREMENTS = [
    // ====================================================
    // Erawan
    // ====================================================

    {
      clientId: erawan.id,
      name: "Medical Check",
      validityMonths: 12,
    },

    {
      clientId: erawan.id,
      name: "Confined Space Entry",
      validityMonths: 12,
    },

    // ====================================================
    // Chevron
    // ====================================================

    {
      clientId: chevron.id,
      name: "Medical Check",
      validityMonths: 12,
    },

    {
      clientId: chevron.id,
      name: "Confined Space Entry",
      validityMonths: 12,
    },

    // ====================================================
    // PTT
    // ====================================================

    {
      clientId: ptt.id,
      name: "Medical Check",
      validityMonths: 12,
    },

    {
      clientId: ptt.id,
      name: "Confined Space Entry",
      validityMonths: 12,
    },

    // ====================================================
    // Valeura
    // ====================================================

    {
      clientId: valeura.id,
      name: "Medical Check",
      validityMonths: 12,
    },

    {
      clientId: valeura.id,
      name: "Confined Space Entry",
      validityMonths: 12,
    },
  ];

  // ======================================================
  // Upsert
  // ======================================================

  for (const req of REQUIREMENTS) {
    await prisma.medicalRequirement.upsert({
      where: {
        clientId_name: {
          clientId: req.clientId,
          name: req.name,
        },
      },

      update: {
        validityMonths: req.validityMonths,
      },

      create: req,
    });

    console.log(`✔ ${req.name}`);
  }

  console.log(`✅ Done seeding Medical Requirements (${REQUIREMENTS.length})`);
}

seedMedicalRequirements()
  .catch((err) => {
    console.error("💥 Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
