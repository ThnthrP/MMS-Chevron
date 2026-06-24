import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  const requirements = await prisma.positionRequirement.findMany({
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
    // Gap Analysis Per Client
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

  const employeeTrainingIds = new Set(
    employee.trainings.map((t) => t.globalTrainingId),
  );

  const result = {};

  for (const req of requirements) {
    const client = req.clientTraining.contract.client.name.toLowerCase();

    if (!result[client]) {
      result[client] = {
        required: [],
        completed: [],
        missing: [],
      };
    }

    const trainingName =
      req.clientTraining.globalTraining?.name ||
      req.clientTraining.nameAlias ||
      "Unknown";

    result[client].required.push(trainingName);

    if (employeeTrainingIds.has(req.clientTraining.globalTrainingId)) {
      result[client].completed.push(trainingName);
    } else {
      result[client].missing.push(trainingName);
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
