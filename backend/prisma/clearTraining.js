import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑 Clearing training tables...");

  // ลบ child ก่อน
  await prisma.clientTraining.deleteMany();

  // ลบ standards
  await prisma.trainingStandard.deleteMany();

  // ลบ trainings
  await prisma.globalTraining.deleteMany();

  console.log("✅ Cleared successfully");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
