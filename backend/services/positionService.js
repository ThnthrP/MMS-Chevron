import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ใช้ใน dropdown ฟอร์ม worker/project (คงรูปเดิม — อย่าแก้ shape)
export async function getPositions() {
  return prisma.position.findMany({
    orderBy: { name: "asc" },
  });
}

// สำหรับหน้า Manage — แนบจำนวน worker + matrix requirement
export async function getPositionsWithCounts() {
  return prisma.position.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { employees: true, requirements: true } },
    },
  });
}

export async function getPositionById(id) {
  return prisma.position.findUnique({ where: { id: String(id) } });
}

export async function createPosition(data) {
  return prisma.position.create({
    data: {
      name: data.name,
      nameTH: data.nameTH || null,
      category: data.category || null,
      isOffshore: data.isOffshore ?? false,
    },
  });
}

export async function updatePosition(id, data) {
  return prisma.position.update({
    where: { id: String(id) },
    data: {
      name: data.name,
      nameTH: data.nameTH || null,
      category: data.category || null,
      isOffshore: data.isOffshore ?? false,
    },
  });
}

// ลบได้เฉพาะตำแหน่งที่ยังไม่ถูกอ้างที่ไหนเลย (กัน orphan/พัง matching)
export async function deletePosition(id) {
  const pid = String(id);
  const [employees, requirements, requests, subRequests] = await Promise.all([
    prisma.employee.count({ where: { positionId: pid } }),
    prisma.positionRequirement.count({ where: { positionId: pid } }),
    prisma.manpowerRequest.count({ where: { positionId: pid } }),
    prisma.subcontractorRequest.count({ where: { positionId: pid } }),
  ]);

  const refs = [];
  if (employees) refs.push(`${employees} worker`);
  if (requirements) refs.push(`${requirements} matrix requirement`);
  if (requests) refs.push(`${requests} manpower request`);
  if (subRequests) refs.push(`${subRequests} subcontractor request`);

  if (refs.length > 0) {
    const err = new Error(
      `ลบไม่ได้ — ตำแหน่งนี้ยังถูกใช้โดย ${refs.join(", ")} (ต้องย้าย/ลบสิ่งเหล่านั้นก่อน)`,
    );
    err.code = "POSITION_IN_USE";
    throw err;
  }

  return prisma.position.delete({ where: { id: pid } });
}

// =========================================================
// Phase B — Matrix Editor (Position × Contract)
// =========================================================

// requirementType -> matrix code (เก็บใน sourceMatrixCode, ไม่ critical ต่อ matching)
// Chevron ใช้จริง: X = mandatory, O = assigned
const REQ_CODE = {
  mandatory: "X",
  assigned: "O",
};

// pool = ClientTraining ทั้งหมดของ contract + ค่าที่ position นี้ตั้งไว้แล้ว (prefill)
export async function getPositionMatrix(positionId, contractId) {
  const pid = String(positionId);
  const cid = String(contractId);

  const [contract, position, pool, current] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: cid },
      include: { client: true },
    }),
    prisma.position.findUnique({ where: { id: pid } }),
    prisma.clientTraining.findMany({
      where: { contractId: cid },
      include: { globalTraining: true },
    }),
    prisma.positionRequirement.findMany({
      where: { positionId: pid, contractId: cid },
    }),
  ]);

  const currentMap = {};
  for (const r of current) currentMap[r.clientTrainingId] = r.requirementType;

  const items = pool
    .map((ct) => ({
      clientTrainingId: ct.id,
      name: ct.globalTraining?.name || ct.nameAlias || "(unnamed)",
      alias: ct.nameAlias || null,
      requirementType: currentMap[ct.id] || null, // null = ยังไม่ required
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    contract: contract
      ? {
          id: contract.id,
          name: contract.name,
          contractNo: contract.contractNo,
          clientName: contract.client?.name || null,
        }
      : null,
    position: position ? { id: position.id, name: position.name } : null,
    items,
  };
}

// replace matrix ของ position+contract — items: [{ clientTrainingId, requirementType }]
export async function replacePositionMatrix(
  positionId,
  contractId,
  items = [],
) {
  const pid = String(positionId);
  const cid = String(contractId);

  // เก็บเฉพาะแถวที่ติ๊กระดับจริง
  const clean = items.filter(
    (i) => i && i.clientTrainingId && i.requirementType,
  );
  const keepIds = clean.map((i) => i.clientTrainingId);

  return prisma.$transaction(async (tx) => {
    // 1) ลบตัวที่ถูกเอาออก (ไม่อยู่ใน items แล้ว) — ขอบเขตแค่ position+contract นี้
    if (keepIds.length === 0) {
      await tx.positionRequirement.deleteMany({
        where: { positionId: pid, contractId: cid },
      });
    } else {
      await tx.positionRequirement.deleteMany({
        where: {
          positionId: pid,
          contractId: cid,
          clientTrainingId: { notIn: keepIds },
        },
      });
    }

    // 2) upsert ตัวที่ติ๊ก (อิง @@unique[positionId, clientTrainingId, contractId])
    for (const it of clean) {
      await tx.positionRequirement.upsert({
        where: {
          positionId_clientTrainingId_contractId: {
            positionId: pid,
            clientTrainingId: it.clientTrainingId,
            contractId: cid,
          },
        },
        update: { requirementType: it.requirementType },
        create: {
          positionId: pid,
          clientTrainingId: it.clientTrainingId,
          contractId: cid,
          requirementType: it.requirementType,
          sourceMatrixCode: REQ_CODE[it.requirementType] || null,
          sourceMatrixSheet: "manual-editor",
        },
      });
    }

    return { positionId: pid, contractId: cid, count: clean.length };
  });
}
