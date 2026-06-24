import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedMedicalRequirements() {
  console.log("🚀 Seeding Medical Requirements...");

  // ======================================================
  // Clients
  // ======================================================

  const chevron = await prisma.client.findUnique({
    where: {
      name: "Chevron",
    },
  });

  // ======================================================
  // Validate
  // ======================================================

  if (!chevron) {
    throw new Error("Client not found: Chevron");
  }

  // ======================================================
  // Requirements
  // ======================================================

  const REQUIREMENTS = [
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
