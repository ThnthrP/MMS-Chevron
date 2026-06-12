import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================
// PERMISSIONS — resource:action
// ============================================================
const PERMISSIONS = [
  // employee
  { resource: "employee", action: "view", description: "ดูข้อมูลพนักงาน" },
  { resource: "employee", action: "create", description: "เพิ่มพนักงาน" },
  { resource: "employee", action: "update", description: "แก้ไขข้อมูลพนักงาน" },
  { resource: "employee", action: "delete", description: "ลบพนักงาน" },

  // mp_request
  { resource: "mp_request", action: "view", description: "ดู request" },
  { resource: "mp_request", action: "create", description: "สร้าง request" },
  { resource: "mp_request", action: "propose", description: "เสนอ candidate" },
  {
    resource: "mp_request",
    action: "approve",
    description: "อนุมัติ/reject candidate (PE)",
  },
  {
    resource: "mp_request",
    action: "override",
    description: "override PE reject (PE Head)",
  },
  {
    resource: "mp_request",
    action: "manage",
    description: "จัดการ request ทั้งหมด",
  },

  // training
  { resource: "training", action: "view", description: "ดู training matrix" },
  {
    resource: "training",
    action: "manage",
    description: "จัดการ training + certificate",
  },
  {
    resource: "training",
    action: "book",
    description: "book training ให้พนักงาน",
  },

  // safety
  { resource: "safety", action: "view", description: "ดูผล screening" },
  {
    resource: "safety",
    action: "manage",
    description: "บันทึก/แก้ไข screening",
  },

  // medical
  { resource: "medical", action: "view", description: "ดู medical record" },
  {
    resource: "medical",
    action: "manage",
    description: "แก้ไข medical record",
  },

  // assignment
  { resource: "assignment", action: "view", description: "ดู assignment" },
  {
    resource: "assignment",
    action: "manage",
    description: "จัดการ assignment + mob/demob",
  },

  // project
  { resource: "project", action: "view", description: "ดูโปรเจกต์" },
  { resource: "project", action: "manage", description: "จัดการโปรเจกต์" },

  // report
  { resource: "report", action: "view", description: "ดู report ทั่วไป" },
  { resource: "report", action: "full", description: "ดู report ทั้งหมด" },

  // bd
  {
    resource: "bd",
    action: "manage",
    description: "จัดการ requirement ของลูกค้า (BD)",
  },

  // system
  {
    resource: "system",
    action: "manage",
    description: "ตั้งค่าระบบ / จัดการ user",
  },
];

// ============================================================
// ROLE → PERMISSIONS mapping
// ============================================================
const ROLE_PERMISSIONS = {
  admin: [
    "employee:view",
    "employee:create",
    "employee:update",
    "employee:delete",
    "mp_request:view",
    "mp_request:create",
    "mp_request:propose",
    "mp_request:approve",
    "mp_request:override",
    "mp_request:manage",
    "training:view",
    "training:manage",
    "training:book",
    "safety:view",
    "safety:manage",
    "medical:view",
    "medical:manage",
    "assignment:view",
    "assignment:manage",
    "project:view",
    "project:manage",
    "report:view",
    "report:full",
    "bd:manage",
    "system:manage",
  ],

  executive: [
    "employee:view",
    "mp_request:view",
    "training:view",
    "safety:view",
    "medical:view",
    "assignment:view",
    "project:view",
    "report:view",
    "report:full",
  ],

  manager: [
    "employee:view",
    "mp_request:view",
    "mp_request:approve",
    "training:view",
    "safety:view",
    "medical:view",
    "assignment:view",
    "project:view",
    "project:manage",
    "report:view",
    "report:full",
  ],

  pe_head: [
    "employee:view",
    "mp_request:view",
    "mp_request:create",
    "mp_request:approve",
    "mp_request:override",
    "training:view",
    "assignment:view",
    "project:view",
    "report:view",
  ],

  pe: [
    "employee:view",
    "mp_request:view",
    "mp_request:create",
    "mp_request:approve",
    "training:view",
    "assignment:view",
    "project:view",
    "report:view",
  ],

  manpower: [
    "employee:view",
    "mp_request:view",
    "mp_request:propose",
    "mp_request:manage",
    "training:view",
    "training:book",
    "assignment:view",
    "assignment:manage",
    "project:view",
    "report:view",
  ],

  hr: [
    "employee:view",
    "employee:create",
    "employee:update",
    "mp_request:view",
    "training:view",
    "training:manage",
    "medical:view",
    "assignment:view",
    "project:view",
    "report:view",
  ],

  safety: [
    "employee:view",
    "mp_request:view",
    "safety:view",
    "safety:manage",
    "medical:view",
    "assignment:view",
    "report:view",
  ],

  nurse: [
    "employee:view",
    "medical:view",
    "medical:manage",
    "safety:view",
    "assignment:view",
  ],

  bd: ["employee:view", "project:view", "bd:manage", "report:view"],

  expert: [
    "employee:view",
    "mp_request:view",
    "mp_request:propose",
    "training:view",
    "training:manage",
    "assignment:view",
    "project:view",
    "report:view",
  ],

  ta: ["employee:view", "mp_request:view", "training:view", "assignment:view"],
};

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("🚀 Seeding start...\n");

  // ── 1. Permissions ──────────────────────────────────────
  console.log("1️⃣ Seeding permissions...");

  await prisma.permission.createMany({
    data: PERMISSIONS,
    skipDuplicates: true,
  });

  const allPerms = await prisma.permission.findMany();

  const permMap = {};

  for (const p of allPerms) {
    permMap[`${p.resource}:${p.action}`] = p.id;
  }

  console.log(`   ✓ ${allPerms.length} permissions`);

  // ── 2. Roles ─────────────────────────────────────────────
  console.log("2️⃣ Seeding roles...");

  const roleNames = Object.keys(ROLE_PERMISSIONS);

  await prisma.role.createMany({
    data: roleNames.map((name) => ({ name })),
    skipDuplicates: true,
  });

  const allRoles = await prisma.role.findMany();

  const roleMap = {};

  for (const r of allRoles) {
    roleMap[r.name] = r.id;
  }

  const adminRoleId = roleMap["admin"];

  if (!adminRoleId) {
    throw new Error("Admin role not found");
  }

  console.log(`   ✓ ${allRoles.length} roles`);

  // ── 3. RolePermissions ───────────────────────────────────
  console.log("3️⃣ Seeding role-permission mappings...");

  await prisma.rolePermission.deleteMany();

  const rpData = [];

  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap[roleName];

    if (!roleId) continue;

    for (const permKey of perms) {
      const permId = permMap[permKey];

      if (!permId) {
        console.warn(`permission not found: ${permKey}`);
        continue;
      }

      rpData.push({
        roleId,
        permissionId: permId,
      });
    }
  }

  await prisma.rolePermission.createMany({
    data: rpData,
    skipDuplicates: true,
  });

  console.log(`   ✓ ${rpData.length} role-permission mappings`);

  // ── 5. Admin Users ───────────────────────────────────────
  console.log("4️⃣ Seeding admin user...");

  const hashedPassword = await bcrypt.hash("admin1234", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@mms.com",
    },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@mms.com",
      password: hashedPassword,
      roleId: adminRoleId,
    },
  });

  console.log("   ✓ Admin user seeded");

  // ── Summary ──────────────────────────────────────────────
  console.log("\n✅ Seed complete!");
  console.log(`   Roles       : ${roleNames.length}`);
  console.log(`   Permissions : ${allPerms.length}`);
  console.log(`   Mappings    : ${rpData.length}`);

  console.log("\n👤 Default Admin Account");
  console.log("   admin@mms.com / admin1234");
}

main()
  .catch((e) => {
    console.error("💥 Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
