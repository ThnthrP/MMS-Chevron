import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// list ทั้งหมด (เรียงตามชื่อ)
export async function listDivisions() {
  return prisma.division.findMany({ orderBy: { name: "asc" } });
}

// สร้างใหม่ (normalize: trim) — กันชื่อว่าง/ซ้ำ
export async function createDivision(rawName) {
  const name = (rawName || "").trim();
  if (!name) throw { status: 400, message: "Division name is required" };

  const exists = await prisma.division.findUnique({ where: { name } });
  if (exists)
    throw { status: 400, message: `Division "${name}" already exists` };

  return prisma.division.create({ data: { name } });
}

// เปลี่ยนชื่อ — sync employee.division เก่าให้ตามด้วย (transaction)
export async function renameDivision(id, rawName) {
  const name = (rawName || "").trim();
  if (!name) throw { status: 400, message: "Division name is required" };

  const current = await prisma.division.findUnique({ where: { id } });
  if (!current) throw { status: 404, message: "Division not found" };

  if (name === current.name) return current; // ไม่เปลี่ยน

  const dup = await prisma.division.findUnique({ where: { name } });
  if (dup) throw { status: 400, message: `Division "${name}" already exists` };

  // เปลี่ยนชื่อใน table + อัปเดต employee ที่ใช้ชื่อเดิม ให้ค่าไม่หลุดจากกัน
  const [division] = await prisma.$transaction([
    prisma.division.update({ where: { id }, data: { name } }),
    prisma.employee.updateMany({
      where: { division: current.name },
      data: { division: name },
    }),
  ]);
  return division;
}

// ลบ — block ถ้ายังมีพนักงานใช้อยู่
export async function deleteDivision(id) {
  const current = await prisma.division.findUnique({ where: { id } });
  if (!current) throw { status: 404, message: "Division not found" };

  const inUse = await prisma.employee.count({
    where: { division: current.name },
  });
  if (inUse > 0) {
    throw {
      status: 400,
      message: `ลบไม่ได้ — มีพนักงาน ${inUse} คนใช้แผนก "${current.name}" อยู่`,
    };
  }

  await prisma.division.delete({ where: { id } });
  return { deleted: true };
}
