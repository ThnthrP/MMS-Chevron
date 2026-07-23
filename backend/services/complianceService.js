import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── ค่า requirementType ที่นับเป็น "Mandatory" (สัญลักษณ์ X) ──
// ข้อมูล Chevron มี 2 ค่าที่ความหมายเดียวกันแต่ enum ต่างกัน:
//   "required"  — มาจาก symbol X ที่ import ผ่าน seedTrainingMatrix.js (bulk import)
//   "mandatory" — มาจาก symbol X เหมือนกัน แต่ import/บันทึกอีกทาง (MatrixEditor UI
//                 เขียนค่านี้เวลาเลือก "Mandatory (X)") — ยืนยันจาก sourceMatrixSheet
//                 ว่าเป็น "Chevron Matrix 2025(14-11-25)" เดียวกันกับ "required"
// ดังนั้นนับรวมทั้งสองค่าเป็นกลุ่มเดียว (Mandatory) เพื่อไม่ให้ 44 requirement
// ที่ import มาจริงหายไปจากการคำนวณ % Match
const MANDATORY_REQUIREMENT_TYPES = ["required", "mandatory"];

export async function getComplianceDashboard() {
  const employees = await prisma.employee.findMany({
    where: {
      status: "active",
    },
    include: {
      position: true,
      trainings: {
        where: {
          isLatest: true,
        },
        include: {
          globalTraining: true,
        },
      },
      passport: true,
      medicalChecks: true,
    },
    orderBy: {
      empCode: "asc",
    },
  });

  // นับ % Match เฉพาะ requirementType ที่เป็น Mandatory (required + mandatory)
  const requirements = await prisma.positionRequirement.findMany({
    where: { requirementType: { in: MANDATORY_REQUIREMENT_TYPES } },
    include: {
      clientTraining: {
        include: {
          globalTraining: true,

          contract: {
            include: {
              client: true,
            },
          },
        },
      },
    },
  });

  const requirementsByPosition = {};

  for (const req of requirements) {
    const positionId = req.positionId;

    if (!requirementsByPosition[positionId]) {
      requirementsByPosition[positionId] = [];
    }

    requirementsByPosition[positionId].push(req);
  }

  const dashboard = employees.map((employee) => {
    const positionRequirements =
      requirementsByPosition[employee.positionId] || [];

    // =========================
    // Cert Alerts (Training + Medical)
    // =========================
    let expired = 0,
      critical = 0,
      warning = 0,
      valid = 0;
    const today = new Date();

    for (const t of employee.trainings) {
      // ไม่มีวันหมดอายุ = permanent = valid (ไม่ใช่ข้าม)
      if (!t.expiryDate) {
        valid++;
        continue;
      }
      const days = Math.ceil(
        (new Date(t.expiryDate) - today) / (1000 * 60 * 60 * 24),
      );
      if (days < 0) expired++;
      else if (days < 30) critical++;
      else if (days <= 60) warning++;
      else valid++;
    }

    for (const m of employee.medicalChecks) {
      // ไม่มีวันหมดอายุ = valid
      if (!m.expiryDate) {
        valid++;
        continue;
      }
      const days = Math.ceil(
        (new Date(m.expiryDate) - today) / (1000 * 60 * 60 * 24),
      );
      if (days < 0) expired++;
      else if (days < 30) critical++;
      else if (days <= 60) warning++;
      else valid++;
    }

    const alerts = { expired, critical, warning, valid };

    // =========================
    // Employee Training IDs
    // =========================
    const employeeTrainingIds = new Set(
      employee.trainings.map((t) => t.globalTrainingId),
    );

    // =========================
    // Gap Analysis Per Client (เฉพาะ Mandatory/"required")
    // =========================
    const clients = {};

    for (const req of positionRequirements) {
      const clientName = req.clientTraining.contract.client.name.toLowerCase();

      if (!clients[clientName]) {
        clients[clientName] = {
          required: 0,
          completed: 0,
          missing: 0,
          score: 0,
        };
      }

      clients[clientName].required++;

      const trainingId = req.clientTraining.globalTrainingId;

      if (employeeTrainingIds.has(trainingId)) {
        clients[clientName].completed++;
      }
    }

    // =========================
    // Calculate Missing + Score
    // =========================
    Object.values(clients).forEach((client) => {
      client.missing = client.required - client.completed;

      client.score =
        client.required > 0
          ? Math.round((client.completed / client.required) * 100)
          : 0;
    });

    return {
      id: employee.id,
      empCode: employee.empCode, // ← เพิ่ม: ใช้แสดงใต้ชื่อ
      fullName: employee.fullName,
      department: employee.division, // schema ใช้ฟิลด์ division
      startWorkDate: employee.startWorkDate, // ← เพิ่ม: ใช้คำนวณ Experience
      position: employee.position,
      medicalChecks: employee.medicalChecks, // ← เพิ่ม: ใช้คอลัมน์ Medical
      alerts,
      clients,
    };
  });

  return dashboard;
}

// ============================================================
// Gap Analysis รายคน — แยก 3 กลุ่มต่อ client
//   mandatory : PositionRequirement ที่ requirementType = "required"
//   assigned  : PositionRequirement ที่ requirementType = "assigned"
//   others    : training ที่พนักงานมี แต่ไม่อยู่ใน matrix (mandatory+assigned) ของ client นั้นเลย
// ============================================================
export async function getWorkerGap(employeeId) {
  const employee = await prisma.employee.findUnique({
    where: {
      id: employeeId,
    },

    include: {
      position: true,

      trainings: {
        where: {
          isLatest: true,
        },

        include: {
          globalTraining: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Worker not found");
  }

  const requirements = await prisma.positionRequirement.findMany({
    where: {
      positionId: employee.positionId,
    },

    include: {
      clientTraining: {
        include: {
          globalTraining: true,

          contract: {
            include: {
              client: true,
            },
          },
        },
      },
    },
  });

  // globalTrainingId -> training record (เฉพาะที่มี globalTrainingId ผูกไว้)
  const employeeTrainingByGlobalId = new Map();
  for (const t of employee.trainings) {
    if (t.globalTrainingId) {
      employeeTrainingByGlobalId.set(t.globalTrainingId, t);
    }
  }
  const employeeTrainingIds = new Set(employeeTrainingByGlobalId.keys());

  const result = {};
  // เก็บ globalTrainingId ที่อยู่ใน matrix (mandatory+assigned) ของแต่ละ client — ใช้หา "Others"
  const matrixTrainingIdsByClient = {};

  for (const req of requirements) {
    const clientName = req.clientTraining.contract.client.name.toLowerCase();

    if (!result[clientName]) {
      result[clientName] = {
        mandatory: { required: [], completed: [], missing: [] },
        assigned: { required: [], completed: [], missing: [] },
        others: { completed: [] },
      };
      matrixTrainingIdsByClient[clientName] = new Set();
    }

    const trainingName =
      req.clientTraining.globalTraining?.name ||
      req.clientTraining.nameAlias ||
      "Unknown";

    const trainingId = req.clientTraining.globalTrainingId;
    matrixTrainingIdsByClient[clientName].add(trainingId);

    // แยกกลุ่มตาม requirementType จริง — "required" และ "mandatory" ถือเป็นกลุ่ม
    // Mandatory เดียวกัน (ดูหมายเหตุ MANDATORY_REQUIREMENT_TYPES ด้านบน)
    let group = null;
    if (MANDATORY_REQUIREMENT_TYPES.includes(req.requirementType)) {
      group = result[clientName].mandatory;
    } else if (req.requirementType === "assigned") {
      group = result[clientName].assigned;
    }
    if (!group) continue;

    group.required.push(trainingName);

    if (employeeTrainingIds.has(trainingId)) {
      group.completed.push(trainingName);
    } else {
      group.missing.push(trainingName);
    }
  }

  // Others — training ที่พนักงานมีจริง แต่ไม่อยู่ใน matrix ของ client นั้นเลย
  for (const clientName of Object.keys(result)) {
    const matrixIds = matrixTrainingIdsByClient[clientName];
    for (const [gtId, t] of employeeTrainingByGlobalId) {
      if (!matrixIds.has(gtId)) {
        result[clientName].others.completed.push(
          t.globalTraining?.name || t.rawTrainingName || "Unknown",
        );
      }
    }
  }

  return {
    employeeId: employee.id,
    fullName: employee.fullName,
    position: employee.position?.name,
    clients: result,
  };
}

export async function getComplianceStats() {
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    include: {
      trainings: { where: { isLatest: true } },
      medicalChecks: true,
    },
  });

  const today = new Date();
  const stats = { expired: 0, critical: 0, warning: 0, valid: 0 };

  for (const employee of employees) {
    for (const cert of employee.trainings) {
      // ไม่มีวันหมดอายุ = permanent = valid (ไม่ใช่ข้าม)
      if (!cert.expiryDate) {
        stats.valid++;
        continue;
      }
      const daysLeft = Math.ceil(
        (new Date(cert.expiryDate) - today) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft < 0) stats.expired++;
      else if (daysLeft < 30) stats.critical++;
      else if (daysLeft <= 60) stats.warning++;
      else stats.valid++;
    }

    for (const medical of employee.medicalChecks) {
      // ไม่มีวันหมดอายุ = valid
      if (!medical.expiryDate) {
        stats.valid++;
        continue;
      }
      const daysLeft = Math.ceil(
        (new Date(medical.expiryDate) - today) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft < 0) stats.expired++;
      else if (daysLeft < 30) stats.critical++;
      else if (daysLeft <= 60) stats.warning++;
      else stats.valid++;
    }
  }

  return stats;
}

export async function getWorkerAlerts(employeeId) {
  const today = new Date();
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      trainings: {
        where: { isLatest: true },
        include: { globalTraining: true },
      },
      medicalChecks: true,
    },
  });

  const expired = [],
    critical = [],
    warning = [];

  for (const t of employee.trainings) {
    if (!t.expiryDate) continue;
    const daysLeft = Math.ceil(
      (new Date(t.expiryDate) - today) / (1000 * 60 * 60 * 24),
    );
    const item = {
      type: "Training",
      name: t.globalTraining?.name || t.rawTrainingName,
      expiryDate: t.expiryDate,
      daysLeft,
    };
    if (daysLeft < 0) expired.push(item);
    else if (daysLeft < 30) critical.push(item);
    else if (daysLeft <= 60) warning.push(item);
  }

  for (const m of employee.medicalChecks) {
    if (!m.expiryDate) continue;
    const daysLeft = Math.ceil(
      (new Date(m.expiryDate) - today) / (1000 * 60 * 60 * 24),
    );
    const item = {
      type: "Medical",
      name: m.checkType,
      expiryDate: m.expiryDate,
      daysLeft,
    };
    if (daysLeft < 0) expired.push(item);
    else if (daysLeft < 30) critical.push(item);
    else if (daysLeft <= 60) warning.push(item);
  }

  return { fullName: employee.fullName, expired, critical, warning };
}

// ============================================================
// Certification detail — มุมมอง "เลือก cert แล้วดูว่าใครสถานะอะไรบ้าง"
//   ต่างจาก getComplianceDashboard (worker-centric) ตรงที่หน้านี้
//   fix ที่ training ตัวเดียว แล้ว list worker ทุกคน (รวมคนที่ไม่มี
//   training นี้เลย = bucket "missing")
// ============================================================
export async function getCertificationDetail(globalTrainingId) {
  const globalTraining = await prisma.globalTraining.findUnique({
    where: { id: globalTrainingId },
  });
  if (!globalTraining) {
    const err = new Error("Training not found");
    err.status = 404;
    throw err;
  }

  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    include: {
      position: true,
      trainings: {
        where: { isLatest: true, globalTrainingId },
      },
    },
    orderBy: { empCode: "asc" },
  });

  const today = new Date();
  const stats = { expired: 0, critical: 0, warning: 0, valid: 0, missing: 0 };

  const workers = employees.map((employee) => {
    const t = employee.trainings[0] || null;

    let bucket;
    let expiryDate = null;
    let completedDate = null;

    if (!t) {
      bucket = "missing";
      stats.missing++;
    } else {
      completedDate = t.completedDate ?? null;

      if (!t.expiryDate) {
        bucket = "valid";
        stats.valid++;
      } else {
        expiryDate = t.expiryDate;
        const days = Math.ceil(
          (new Date(t.expiryDate) - today) / (1000 * 60 * 60 * 24),
        );
        if (days < 0) {
          bucket = "expired";
          stats.expired++;
        } else if (days < 30) {
          bucket = "critical";
          stats.critical++;
        } else if (days <= 60) {
          bucket = "warning";
          stats.warning++;
        } else {
          bucket = "valid";
          stats.valid++;
        }
      }
    }

    return {
      employeeId: employee.id,
      empCode: employee.empCode,
      fullName: employee.fullName,
      position: employee.position?.name || null,
      department: employee.division || null,
      bucket,
      hasRecord: !!t, // ← เพิ่มใหม่ — true = มี training record, false = ไม่มีเลย (missing)
      completedDate,
      expiryDate,
    };
  });

  return {
    trainingId: globalTraining.id,
    trainingName: globalTraining.name,
    stats,
    workers,
  };
}
