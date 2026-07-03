import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// Backfill mobilizationStatus/availabilityStatus ให้ทุกคนที่มีอยู่แล้ว
// ใช้ logic เดียวกับ workerService.recomputeMobilizationAndAvailability
//
//   node scripts/chevron/backfillMobilizationStatus.js          → DRY-RUN
//   node scripts/chevron/backfillMobilizationStatus.js --apply  → เขียนจริง
// ============================================================

const DRY_RUN = !process.argv.includes("--apply");
const PRIMARY_CLIENT_NAME = "Chevron";

async function computeMatchPercent(employee, requirementsByPosition) {
  if (!employee.positionId) return null;

  const requirements = requirementsByPosition.get(employee.positionId);
  if (!requirements || requirements.length === 0) return null;

  const requiredIds = new Set(requirements.map((r) => r.globalTrainingId));
  const completedIds = new Set(
    employee.trainings.map((t) => t.globalTrainingId).filter(Boolean),
  );

  const required = requiredIds.size;
  const completed = [...requiredIds].filter((id) =>
    completedIds.has(id),
  ).length;
  const score = required > 0 ? Math.round((completed / required) * 100) : 0;

  // เช็คใบหมดอายุ — ทุกใบที่มี expiryDate ทั้ง training และ medical
  const now = new Date();
  const hasExpiredCert =
    employee.trainings.some(
      (t) => t.expiryDate && new Date(t.expiryDate) < now,
    ) ||
    employee.medicalChecks.some(
      (m) => m.expiryDate && new Date(m.expiryDate) < now,
    );

  return { required, completed, score, hasExpiredCert };
}

async function main() {
  console.log(
    `\n🔧 MODE: ${DRY_RUN ? "DRY-RUN (ไม่เขียน)" : "APPLY (เขียน DB)"}\n`,
  );

  const client = await prisma.client.findFirst({
    where: { name: PRIMARY_CLIENT_NAME },
  });
  if (!client) throw new Error(`Client not found: ${PRIMARY_CLIENT_NAME}`);

  const contract = await prisma.contract.findFirst({
    where: { clientId: client.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!contract) throw new Error(`Contract not found: ${PRIMARY_CLIENT_NAME}`);

  // โหลด requirements ทั้งหมดของ contract นี้ จัดกลุ่มตาม positionId ไว้ล่วงหน้า
  const allRequirements = await prisma.positionRequirement.findMany({
    where: { contractId: contract.id },
    include: { clientTraining: { select: { globalTrainingId: true } } },
  });
  const requirementsByPosition = new Map();
  for (const r of allRequirements) {
    const list = requirementsByPosition.get(r.positionId) || [];
    list.push({ globalTrainingId: r.clientTraining.globalTrainingId });
    requirementsByPosition.set(r.positionId, list);
  }

  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    include: {
      trainings: {
        where: { isLatest: true },
        select: { globalTrainingId: true, expiryDate: true },
      },
      medicalChecks: {
        select: { expiryDate: true },
      },
    },
  });

  console.log(`👥 Active employees: ${employees.length}`);

  const stats = {
    readyCount: 0,
    pendingCount: 0,
    skippedNoMatrix: 0,
    skippedOnSite: 0,
    changed: 0,
    unchanged: 0,
  };

  for (const employee of employees) {
    if (employee.mobilizationStatus === "on_site") {
      stats.skippedOnSite++;
      continue; // ไม่แตะ — ลงพื้นที่จริงแล้ว ต้องแก้มือเท่านั้น
    }

    const match = await computeMatchPercent(employee, requirementsByPosition);
    if (!match) {
      stats.skippedNoMatrix++;
      continue; // ไม่มีตำแหน่ง/ไม่มี matrix — คงสถานะเดิม
    }

    const newMobilization =
      match.score === 100 && !match.hasExpiredCert ? "ready" : "pending";
    const newAvailability = "available";

    if (newMobilization === "ready") stats.readyCount++;
    else stats.pendingCount++;

    const changed =
      employee.mobilizationStatus !== newMobilization ||
      employee.availabilityStatus !== newAvailability;

    if (changed) {
      stats.changed++;
      console.log(
        `${DRY_RUN ? "🔍" : "✔"} ${employee.empCode} ${employee.fullName}: ` +
          `${employee.mobilizationStatus} → ${newMobilization} ` +
          `(${match.completed}/${match.required} = ${match.score}%` +
          `${match.hasExpiredCert ? ", มีใบหมดอายุ" : ""})`,
      );
      if (!DRY_RUN) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            mobilizationStatus: newMobilization,
            availabilityStatus: newAvailability,
          },
        });
      }
    } else {
      stats.unchanged++;
    }
  }

  console.log("\n========== SUMMARY ==========");
  console.log("✔ Changed:", stats.changed);
  console.log("• Unchanged (already correct):", stats.unchanged);
  console.log("⚠ Skipped (no position/matrix):", stats.skippedNoMatrix);
  console.log("⚠ Skipped (already on_site):", stats.skippedOnSite);
  console.log("— Ready:", stats.readyCount, " / Pending:", stats.pendingCount);

  if (DRY_RUN) {
    console.log(
      "\n💡 DRY-RUN — ยังไม่เขียน DB. รันใหม่ด้วย --apply เพื่อบันทึกจริง\n",
    );
  } else {
    console.log("\n✅ Done\n");
  }
}

main()
  .catch((err) => {
    console.error("💥 Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
