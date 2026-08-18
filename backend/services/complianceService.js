import { PrismaClient } from "@prisma/client";
import {
  getExpiryBucket,
  getMedicalExpiryBucket,
} from "../utils/expiryStatus.js";

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

// checkType ที่ต้องใช้ threshold ยาวกว่าปกติ (90 วัน แทน 60 วัน) เพราะนัดคิว
// โรงพยาบาล/ส่งต่อแพทย์เฉพาะทางใช้เวลานานกว่าจะจัด training ใหม่ได้
// ดู utils/expiryStatus.js สำหรับที่มาของ threshold นี้ (ตรงกับสูตร col AN
// ในไฟล์ PE tracking Excel ที่ทีม HR ใช้จริง)
const MEDICAL_EXAM_CHECK_TYPES = ["Medical Check up"];

// เลือก bucket calculator ให้ตรงกับประเภทของ MedicalCheck —
// รวมจุดตัดสินใจนี้ไว้ที่เดียว กันไม่ให้ threshold เพี้ยนไปคนละที่คนละทาง
// ในทั้ง 3 ฟังก์ชันด้านล่างที่ loop ผ่าน medicalChecks
function getMedicalCheckBucket(medicalCheck) {
  return MEDICAL_EXAM_CHECK_TYPES.includes(medicalCheck.checkType)
    ? getMedicalExpiryBucket(medicalCheck.expiryDate)
    : getExpiryBucket(medicalCheck.expiryDate);
}

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
    const alerts = { expired: 0, critical: 0, warning: 0, valid: 0 };

    for (const t of employee.trainings) {
      alerts[getExpiryBucket(t.expiryDate)]++;
    }

    for (const m of employee.medicalChecks) {
      alerts[getMedicalCheckBucket(m)]++;
    }

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

  const stats = { expired: 0, critical: 0, warning: 0, valid: 0 };

  for (const employee of employees) {
    for (const cert of employee.trainings) {
      stats[getExpiryBucket(cert.expiryDate)]++;
    }

    for (const medical of employee.medicalChecks) {
      stats[getMedicalCheckBucket(medical)]++;
    }
  }

  return stats;
}

export async function getWorkerAlerts(employeeId) {
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

  const pushByBucket = (bucket, item) => {
    if (bucket === "expired") expired.push(item);
    else if (bucket === "critical") critical.push(item);
    else if (bucket === "warning") warning.push(item);
    // "valid" → ไม่ต้องขึ้น alert
  };

  for (const t of employee.trainings) {
    if (!t.expiryDate) continue;
    const daysLeft = Math.ceil(
      (new Date(t.expiryDate) - Date.now()) / 86400000,
    );
    pushByBucket(getExpiryBucket(t.expiryDate), {
      type: "Training",
      name: t.globalTraining?.name || t.rawTrainingName,
      expiryDate: t.expiryDate,
      daysLeft,
    });
  }

  for (const m of employee.medicalChecks) {
    if (!m.expiryDate) continue;
    const daysLeft = Math.ceil(
      (new Date(m.expiryDate) - Date.now()) / 86400000,
    );
    pushByBucket(getMedicalCheckBucket(m), {
      type: "Medical",
      name: m.checkType,
      expiryDate: m.expiryDate,
      daysLeft,
    });
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
      expiryDate = t.expiryDate ?? null;
      bucket = getExpiryBucket(t.expiryDate);
      stats[bucket]++;
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

// ============================================================
// Request Training — MP ขอให้ HR จัด training ให้ worker ที่ยังขาด/หมดอายุ cert นี้
// แค่ validate + สร้างข้อมูลสำหรับ notification (ไม่มี record ถาวร)
// ============================================================
export async function requestTraining(trainingId, employeeIds) {
  const training = await prisma.globalTraining.findUnique({
    where: { id: trainingId },
    select: { name: true },
  });
  if (!training) {
    const err = new Error("Training not found");
    err.status = 404;
    throw err;
  }

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, fullName: true, empCode: true },
  });
  if (employees.length === 0) {
    const err = new Error("No valid employees found");
    err.status = 404;
    throw err;
  }

  return {
    trainingName: training.name,
    employeeCount: employees.length,
    employeeNames: employees.map((e) => e.fullName),
  };
}
