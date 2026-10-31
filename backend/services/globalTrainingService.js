import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════
// TRAINING SOURCE OPTIONS — user เพิ่ม/ลบเองได้ (แทน enum เดิม)
// ════════════════════════════════════════════════════════════════
export async function listTrainingSources() {
  return prisma.trainingSourceOption.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { trainingStandards: true } },
    },
  });
}

export async function createTrainingSource({ name, requiresClient }) {
  try {
    return await prisma.trainingSourceOption.create({
      data: { name: name.trim(), requiresClient: !!requiresClient },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error(`มี source ชื่อ "${name}" อยู่แล้ว`);
      err.status = 400;
      throw err;
    }
    throw error;
  }
}

export async function deleteTrainingSource(id) {
  const count = await prisma.trainingStandard.count({
    where: { sourceId: id },
  });
  if (count > 0) {
    const err = new Error(
      `ลบไม่ได้ — source นี้ถูกใช้อยู่ใน ${count} training standard`,
    );
    err.status = 400;
    throw err;
  }
  return prisma.trainingSourceOption.delete({ where: { id } });
}

// ════════════════════════════════════════════════════════════════
// GET — list ทั้งหมด (รองรับ search by name/fullName) + จำนวน standards
//        + summary ของ standard แรก (สำหรับแสดงคอลัมน์ในตาราง)
// ════════════════════════════════════════════════════════════════
export async function listGlobalTrainings(search) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const trainings = await prisma.globalTraining.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          trainingStandards: true,
          employeeTrainings: { where: { isLatest: true } },
        },
      },
      trainingStandards: {
        take: 1,
        orderBy: { createdAt: "asc" },
        include: { source: true },
      },
      clientTrainings: {
        select: {
          contract: {
            select: { client: { select: { id: true, name: true } } },
          },
          _count: { select: { requirements: true } },
        },
      },
    },
  });

  return trainings.map((t) => {
    const std = t.trainingStandards[0];
    const { trainingStandards, clientTrainings, ...rest } = t;
    return {
      ...rest,
      standard: std
        ? {
            id: std.id,
            sourceName: std.source.name,
            trainingHours: std.trainingHours,
            validityDays: std.validityDays,
            isNoExpiry: std.isNoExpiry,
          }
        : null,
      // ← เปลี่ยนจาก array ของ string เป็น array ของ object
      clientUsage: clientTrainings.map((ct) => ({
        name: ct.contract.client.name,
        positionCount: ct._count.requirements,
      })),
    };
  });
}

// ════════════════════════════════════════════════════════════════
// GET — detail 1 ตัว พร้อม trainingStandards (+ source + client + จำนวน contract ที่ใช้ standard นั้นอยู่)
// ════════════════════════════════════════════════════════════════
export async function getGlobalTrainingDetail(id) {
  const training = await prisma.globalTraining.findUnique({
    where: { id },
    include: {
      trainingStandards: {
        include: {
          source: true,
          client: { select: { id: true, name: true } },
          _count: { select: { clientTrainings: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      // ← เพิ่มใหม่
      clientTrainings: {
        select: {
          id: true,
          trainingStandardId: true,
          contract: {
            select: { id: true, client: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!training) return null;

  return {
    ...training,
    trainingStandards: training.trainingStandards.map((std) => ({
      ...std,
      _clientTrainingCount: std._count.clientTrainings,
    })),
  };
}

// ════════════════════════════════════════════════════════════════
// POST — สร้าง GlobalTraining ใหม่
// ════════════════════════════════════════════════════════════════
export async function createGlobalTraining({ name, fullName, description }) {
  return prisma.globalTraining.create({
    data: { name, fullName, description },
  });
}

// ════════════════════════════════════════════════════════════════
// PUT — แก้ไข GlobalTraining
// ════════════════════════════════════════════════════════════════
export async function updateGlobalTraining(
  id,
  { name, fullName, description },
) {
  return prisma.globalTraining.update({
    where: { id },
    data: { name, fullName, description },
  });
}

// ════════════════════════════════════════════════════════════════
// DELETE — ลบ GlobalTraining (guard: ต้องไม่มี trainingStandards ผูกอยู่)
// ════════════════════════════════════════════════════════════════
export async function deleteGlobalTraining(id) {
  const count = await prisma.trainingStandard.count({
    where: { globalTrainingId: id },
  });
  if (count > 0) {
    const err = new Error(
      `ลบไม่ได้ — มี ${count} training standard ผูกอยู่ กรุณาลบ standard ทั้งหมดก่อน`,
    );
    err.status = 400;
    throw err;
  }
  return prisma.globalTraining.delete({ where: { id } });
}

// ════════════════════════════════════════════════════════════════
// POST — สร้าง TrainingStandard ใหม่ ผูกกับ GlobalTraining
//   sourceId แทน source enum เดิม — clientId บังคับก็ต่อเมื่อ source นั้น requiresClient = true
// ════════════════════════════════════════════════════════════════
export async function createTrainingStandard(globalTrainingId, data) {
  const sourceOption = await prisma.trainingSourceOption.findUnique({
    where: { id: data.sourceId },
  });
  if (!sourceOption) {
    const err = new Error("ไม่พบ source ที่เลือก");
    err.status = 400;
    throw err;
  }
  if (sourceOption.requiresClient && !data.clientId) {
    const err = new Error(
      `source "${sourceOption.name}" ต้องเลือก client ด้วย`,
    );
    err.status = 400;
    throw err;
  }

  try {
    return await prisma.trainingStandard.create({
      data: {
        globalTrainingId,
        sourceId: data.sourceId,
        clientId: sourceOption.requiresClient ? data.clientId || null : null,
        trainingHours: data.trainingHours,
        validityDays: data.isNoExpiry ? null : data.validityDays,
        isNoExpiry: data.isNoExpiry,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error(
        "มี standard สำหรับ source นี้ (และ client นี้ถ้ามี) อยู่แล้ว — แก้ standard เดิมแทนการสร้างซ้ำ",
      );
      err.status = 400;
      throw err;
    }
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// PUT — แก้ไข TrainingStandard
// ════════════════════════════════════════════════════════════════
export async function updateTrainingStandard(standardId, data) {
  const sourceOption = await prisma.trainingSourceOption.findUnique({
    where: { id: data.sourceId },
  });
  if (!sourceOption) {
    const err = new Error("ไม่พบ source ที่เลือก");
    err.status = 400;
    throw err;
  }
  if (sourceOption.requiresClient && !data.clientId) {
    const err = new Error(
      `source "${sourceOption.name}" ต้องเลือก client ด้วย`,
    );
    err.status = 400;
    throw err;
  }

  try {
    return await prisma.trainingStandard.update({
      where: { id: standardId },
      data: {
        sourceId: data.sourceId,
        clientId: sourceOption.requiresClient ? data.clientId || null : null,
        trainingHours: data.trainingHours,
        validityDays: data.isNoExpiry ? null : data.validityDays,
        isNoExpiry: data.isNoExpiry,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error(
        "มี standard สำหรับ source นี้ (และ client นี้ถ้ามี) อยู่แล้ว — แก้ standard เดิมแทนการสร้างซ้ำ",
      );
      err.status = 400;
      throw err;
    }
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// DELETE — ลบ TrainingStandard (guard: ต้องไม่มี ClientTraining ผูกอยู่)
// ════════════════════════════════════════════════════════════════
export async function deleteTrainingStandard(standardId) {
  const count = await prisma.clientTraining.count({
    where: { trainingStandardId: standardId },
  });
  if (count > 0) {
    const err = new Error(
      `ลบไม่ได้ — standard นี้ถูกใช้อยู่ใน ${count} contract`,
    );
    err.status = 400;
    throw err;
  }
  return prisma.trainingStandard.delete({ where: { id: standardId } });
}

// ════════════════════════════════════════════════════════════════
// ตรวจชื่อ cert — ใบ cert (isLatest) ของ training นี้ แยกกลุ่มตาม "ชื่อในไฟล์" (rawTrainingName)
//   ให้ HR เทียบว่าชื่อในไฟล์ Excel ผูกกับ training ในระบบถูกตัวไหม
// ════════════════════════════════════════════════════════════════
const looseName = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s\-_/().,:;'"&]+/g, "");

export async function getTrainingCerts(id) {
  const training = await prisma.globalTraining.findUnique({
    where: { id },
    select: { id: true, name: true, fullName: true },
  });
  if (!training) return null;

  const certs = await prisma.employeeTraining.findMany({
    where: { globalTrainingId: id, isLatest: true },
    orderBy: [{ rawTrainingName: "asc" }, { completedDate: "desc" }],
    select: {
      id: true,
      rawTrainingName: true,
      completedDate: true,
      expiryDate: true,
      source: true,
      employee: {
        select: {
          id: true,
          empId: true,
          empCode: true,
          fullName: true,
          fullNameEN: true,
          fullNameTH: true,
          status: true,
          position: { select: { name: true } },
        },
      },
    },
  });

  // ชื่อที่ถือว่า "ตรงกับระบบ" = ชื่อกลาง + ทุกชื่อใน "ชื่อที่ HR ใช้ในไฟล์" (คั่นด้วย |)
  const known = new Set(
    [training.name, ...String(training.fullName || "").split("|")]
      .map(looseName)
      .filter(Boolean),
  );

  const groups = new Map();
  for (const c of certs) {
    const raw = (c.rawTrainingName || "").trim();
    const key = raw || "";
    if (!groups.has(key)) {
      groups.set(key, {
        rawName: raw || null,
        matchesSystemName: raw ? known.has(looseName(raw)) : null,
        certs: [],
      });
    }
    groups.get(key).certs.push({
      id: c.id,
      completedDate: c.completedDate,
      expiryDate: c.expiryDate,
      source: c.source,
      employee: {
        id: c.employee.id,
        empId: c.employee.empId,
        empCode: c.employee.empCode,
        fullName: c.employee.fullName,
        fullNameEN: c.employee.fullNameEN,
        fullNameTH: c.employee.fullNameTH,
        status: c.employee.status,
        position: c.employee.position?.name || null,
      },
    });
  }

  // กลุ่มที่ชื่อไม่ตรงขึ้นก่อน (HR ควรตรวจ) → ไม่มีชื่อในไฟล์ → ตรงแล้ว
  const rank = (g) => (g.matchesSystemName === false ? 0 : g.matchesSystemName === null ? 1 : 2);
  const list = [...groups.values()]
    .map((g) => ({ ...g, count: g.certs.length }))
    .sort((a, b) => rank(a) - rank(b) || b.count - a.count);

  return { training, total: certs.length, groups: list };
}

// ════════════════════════════════════════════════════════════════
// ย้ายใบ cert ไป training อื่น (กรณีผูกผิดตัว)
//   - ย้ายทั้งประวัติของพนักงานคนนั้นใน training เดิม (ทุก version) ไปด้วย
//   - ใบที่ issued ล่าสุดของ training ปลายทางเป็น isLatest (แบบเดียวกับ scripts/merge-trainings.js)
//   - clientTrainingId ชี้ไป ClientTraining ของ training ปลายทางใน contract เดิม (ถ้ามี)
// ════════════════════════════════════════════════════════════════
const httpError = (status, message) => Object.assign(new Error(message), { status });

export async function reassignCerts(fromId, { certIds, targetTrainingId }) {
  if (!Array.isArray(certIds) || certIds.length === 0) throw httpError(400, "ยังไม่ได้เลือกใบ cert");
  if (!targetTrainingId) throw httpError(400, "ยังไม่ได้เลือก training ปลายทาง");
  if (targetTrainingId === fromId) throw httpError(400, "training ปลายทางต้องไม่ใช่ตัวเดิม");

  const [from, target] = await Promise.all([
    prisma.globalTraining.findUnique({ where: { id: fromId }, select: { id: true, name: true } }),
    prisma.globalTraining.findUnique({ where: { id: targetTrainingId }, select: { id: true, name: true } }),
  ]);
  if (!from) throw httpError(404, "ไม่พบ training ต้นทาง");
  if (!target) throw httpError(404, "ไม่พบ training ปลายทาง");

  const picked = await prisma.employeeTraining.findMany({
    where: { id: { in: certIds }, globalTrainingId: fromId, isLatest: true },
    select: { employeeId: true, employee: { select: { empId: true, empCode: true } } },
  });
  if (picked.length !== certIds.length) {
    throw httpError(409, "ข้อมูล cert เปลี่ยนไประหว่างนี้ — โหลดหน้าใหม่แล้วลองอีกครั้ง");
  }
  const employeeIds = [...new Set(picked.map((p) => p.employeeId))];

  const targetCts = await prisma.clientTraining.findMany({
    where: { globalTrainingId: targetTrainingId },
    select: { id: true, contractId: true },
  });
  const ctByContract = new Map(targetCts.map((ct) => [ct.contractId, ct.id]));

  const moved = await prisma.$transaction(
    async (tx) => {
      let count = 0;
      for (const employeeId of employeeIds) {
        const rows = await tx.employeeTraining.findMany({
          where: { employeeId, globalTrainingId: fromId },
          select: { id: true, contractId: true },
        });
        for (const r of rows) {
          await tx.employeeTraining.update({
            where: { id: r.id },
            data: {
              globalTrainingId: targetTrainingId,
              clientTrainingId: r.contractId ? ctByContract.get(r.contractId) || null : null,
            },
          });
          count++;
        }

        // คำนวณ isLatest ใหม่ใน training ปลายทาง — issued ล่าสุดชนะ
        const all = await tx.employeeTraining.findMany({
          where: { employeeId, globalTrainingId: targetTrainingId },
          select: { id: true, completedDate: true, updatedAt: true },
        });
        const t = (d) => (d ? new Date(d).getTime() : -Infinity);
        all.sort((a, b) => t(b.completedDate) - t(a.completedDate) || t(b.updatedAt) - t(a.updatedAt));
        await tx.employeeTraining.updateMany({
          where: { employeeId, globalTrainingId: targetTrainingId },
          data: { isLatest: false },
        });
        await tx.employeeTraining.update({ where: { id: all[0].id }, data: { isLatest: true } });
      }
      return count;
    },
    { timeout: 60000 },
  );

  return {
    from,
    target,
    employeeCount: employeeIds.length,
    recordCount: moved,
    empIds: picked.map((p) => p.employee.empId || p.employee.empCode),
  };
}
