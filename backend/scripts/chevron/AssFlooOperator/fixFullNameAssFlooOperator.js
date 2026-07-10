// ════════════════════════════════════════════════════════════════
// fixFullNameAssFlooOperator.js — one-off fix
// แก้ fullName ของ 4 คนที่ createEmployeesAssFlooOperator.js เคยสร้างผิด
// (fullName ดันเป็นชื่อไทย ทั้งที่ทั้งระบบ convention ใช้ fullName = ชื่ออังกฤษ)
//
//   node scripts/chevron/fixFullNameAssFlooOperator.js            → DRY-RUN
//   node scripts/chevron/fixFullNameAssFlooOperator.js --apply    → เขียนจริง
// ════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

// รายชื่อ 4 คนที่ต้องแก้ (empCode จากภาพ: EXPT-204 ถึง EXPT-207)
const FIXES = [
  { empCode: "EXPT-204", fullNameEN: "Sanporn Sannu" },
  { empCode: "EXPT-205", fullNameEN: "Woraphong Srithong" },
  { empCode: "EXPT-206", fullNameEN: "Adison Buathong" },
  { empCode: "EXPT-207", fullNameEN: "Arlif Haya" },
];

async function main() {
  console.log(
    `\n🔧 MODE: ${APPLY ? "APPLY (เขียน DB)" : "DRY-RUN (ไม่เขียน)"}\n`,
  );

  for (const fix of FIXES) {
    const emp = await prisma.employee.findFirst({
      where: { empCode: fix.empCode },
    });

    if (!emp) {
      console.log(`⚠ ไม่พบ empCode: ${fix.empCode}`);
      continue;
    }

    console.log(
      `${fix.empCode}  fullName: "${emp.fullName}"  →  "${fix.fullNameEN}"`,
    );

    if (APPLY) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { fullName: fix.fullNameEN },
      });
    }
  }

  if (!APPLY) {
    console.log(
      "\n💡 DRY-RUN — ยังไม่เขียน DB. ถ้าผลโอเค รันใหม่ด้วย --apply\n",
    );
  } else {
    console.log("\n✅ แก้ fullName ครบแล้ว\n");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("💥", err);
  await prisma.$disconnect();
  process.exit(1);
});
