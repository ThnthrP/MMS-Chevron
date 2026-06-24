import { execSync } from "child_process";

const commands = [
  "node prisma/seed.js",

  "node prisma/seeds/common/seedClients.js",
  "node prisma/seeds/common/seedContracts.js",
  "node prisma/seeds/common/seedPositions.js",
  "node prisma/seeds/common/seedGlobalTrainings.js",
  "node prisma/seeds/common/seedTrainingStandards.js",
  "node prisma/seeds/common/seedMedicalRequirements.js",

  "node prisma/seeds/chevron/seedClientTrainings.js",
  
  "node scripts/chevron/importEmployees.js",
  "node scripts/chevron/importEmployeeTrainings.js",
  "node scripts/chevron/importMatrix.js",
];

for (const cmd of commands) {
  console.log(`\n🚀 ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

console.log("\n✅ Chevron setup completed");
