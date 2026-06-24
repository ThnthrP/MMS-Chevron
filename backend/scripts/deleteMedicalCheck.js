import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLIENT_NAME = "Chevron";

async function main() {
  const client = await prisma.client.findFirst({
    where: { name: CLIENT_NAME },
  });

  if (!client) {
    throw new Error(`Client not found: ${CLIENT_NAME}`);
  }

  const reqs = await prisma.medicalRequirement.findMany({
    where: { clientId: client.id },
    select: { id: true },
  });

  if (reqs.length === 0) {
    console.log(
      `⚠ ไม่มี MedicalRequirement ของ ${CLIENT_NAME} — ไม่มีอะไรให้ลบ`,
    );
    return;
  }

  const reqIds = reqs.map((r) => r.id);

  // เช็คก่อนว่าจะลบกี่ record
  const count = await prisma.medicalCheck.count({
    where: { medicalRequirementId: { in: reqIds } },
  });
  console.log(`🔎 พบ MedicalCheck ของ ${CLIENT_NAME} ที่จะลบ: ${count} record`);

  const del = await prisma.medicalCheck.deleteMany({
    where: { medicalRequirementId: { in: reqIds } },
  });

  console.log(`🗑 deleted: ${del.count}`);
}

main()
  .catch((err) => {
    console.error("💥 Delete failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
