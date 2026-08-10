// prisma/seedMobilizationPermission.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const permission = await prisma.permission.upsert({
    where: {
      resource_action: {
        resource: "mobilization_checklist",
        action: "update",
      },
    },
    update: {},
    create: {
      resource: "mobilization_checklist",
      action: "update",
      description: "ติ๊กผล Pre-Mob Checklist (alcohol/drug/ppe/etc.)",
    },
  });

  // safety/nurse → งานตรวจร่างกาย/PPE ตรงตัว
  // ta → ตรงกับ pre_field_training โดยเฉพาะ
  const targetRoleNames = ["safety", "nurse", "ta"];
  const roles = await prisma.role.findMany({
    where: { name: { in: targetRoleNames } },
  });

  if (roles.length !== targetRoleNames.length) {
    const found = roles.map((r) => r.name);
    const missing = targetRoleNames.filter((n) => !found.includes(n));
    console.warn(
      `⚠ ไม่พบ role: ${missing.join(", ")} ใน DB — เช็คชื่อ role จริงในตาราง Role`,
    );
  }

  for (const role of roles) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
    console.log(`✓ ผูก permission ให้ role "${role.name}" แล้ว`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
