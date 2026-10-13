import { PrismaClient } from "@prisma/client";
import * as service from "../services/workerService.js";
import * as allocationService from "../services/allocationService.js";

const prisma = new PrismaClient();

export async function getWorkers(req, res) {
  try {
    const workers = await service.getWorkers();
    res.json(workers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// ── ดึงค่า Health Risk ทั้งหมดที่มีอยู่จริงในระบบ (distinct) ──
// ใช้เป็น option list ให้ CreatableSelect ในหน้า EditWorker — โตเองตามข้อมูลจริง
// ไม่ต้องแก้โค้ด frontend ทุกครั้งที่เจอค่าใหม่จากการ import
export const getHealthRiskOptions = async (req, res) => {
  try {
    const options = await service.getHealthRiskOptions();
    res.json(options);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch health risk options" });
  }
};

// ── รหัสพนักงาน EXPT ถัดไป สำหรับ prefill ในฟอร์ม Add Worker ──
export async function getNextEmpCode(req, res) {
  try {
    const nextCode = await service.getNextEmpCode();
    res.json({ nextCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate employee code" });
  }
}

export async function getWorkerById(req, res) {
  try {
    const worker = await service.getWorkerById(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    res.json(worker);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function createWorker(req, res) {
  try {
    const worker = await service.createWorker(req.body);
    res.status(201).json(worker);
  } catch (error) {
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      if (field === "empCode") {
        return res.status(400).json({
          message: `Employee Code "${req.body.empCode}" already exists. Please use a different code.`,
        });
      }
      return res.status(400).json({
        message: `Duplicate value on field: ${field}`,
      });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to create worker" });
  }
}

export async function updateWorker(req, res) {
  try {
    const worker = await service.updateWorker(req.params.id, req.body);
    res.json(worker);
  } catch (error) {
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      if (field === "empCode") {
        return res.status(400).json({
          message: `Employee Code "${req.body.empCode}" already exists.`,
        });
      }
      if (field === "empId") {
        // ← เพิ่ม
        return res.status(400).json({
          // ← เพิ่ม
          message: `Employee ID "${req.body.empId}" already exists for another employee.`, // ← เพิ่ม
        }); // ← เพิ่ม
      } // ← เพิ่ม
    }
    console.error(error);
    res.status(500).json({ message: "Failed to update worker" });
  }
}

export async function deleteWorker(req, res) {
  try {
    await service.deleteWorker(req.params.id);
    res.json({ message: "Worker deactivated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to deactivate worker" });
  }
}

export async function createPassport(req, res) {
  try {
    const passport = await service.createPassport(req.params.id, req.body);
    res.status(201).json(passport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create passport" });
  }
}

export async function createTraining(req, res) {
  try {
    const training = await service.createTraining(req.params.id, req.body);
    res.status(201).json(training);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create training record" });
  }
}

export async function updateTraining(req, res) {
  try {
    const training = await service.updateTraining(
      req.params.trainingId,
      req.body,
    );
    res.json(training);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update training record" });
  }
}

export async function deleteTraining(req, res) {
  try {
    await service.deleteTraining(req.params.trainingId);
    res.json({ message: "Training record deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete training record" });
  }
}

export async function createMedical(req, res) {
  try {
    const medical = await service.createMedical(req.params.id, req.body);
    res.status(201).json(medical);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create medical record" });
  }
}

export async function updateMedical(req, res) {
  try {
    const medical = await service.updateMedical(req.params.medicalId, req.body);
    res.json(medical);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update medical record" });
  }
}

export async function getDivisions(req, res) {
  try {
    const divisions = await service.getDivisions();
    res.json(divisions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function deleteMedical(req, res) {
  try {
    await service.deleteMedical(req.params.medicalId);
    res.json({ message: "Medical record deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete medical record" });
  }
}

// ════════════════════════════════════════════════════════════════
// Past Deployment (Project References) — manual/historical entry
// ════════════════════════════════════════════════════════════════
export async function createDeployment(req, res) {
  try {
    const deployment = await service.createDeployment(req.params.id, req.body);
    res.status(201).json(deployment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create deployment record" });
  }
}

export async function updateDeployment(req, res) {
  try {
    const deployment = await service.updateDeployment(
      req.params.deploymentId,
      req.body,
    );
    res.json(deployment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update deployment record" });
  }
}

export async function deleteDeployment(req, res) {
  try {
    await service.deleteDeployment(req.params.deploymentId);
    res.json({ message: "Deployment record deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete deployment record" });
  }
}

// ════════════════════════════════════════════════════════════════
// Photo Upload
// ════════════════════════════════════════════════════════════════
export async function uploadPhoto(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const photoUrl = `/uploads/photos/${req.file.filename}`;
    const worker = await service.updateWorkerPhoto(req.params.id, photoUrl);
    res.json({ photoUrl, worker });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: error.message || "Failed to upload photo" });
  }
}

export async function uploadCertFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const certFileUrl = `/uploads/certs/${req.file.filename}`;
    const training = await service.updateTrainingCertFile(
      req.params.trainingId,
      certFileUrl,
      req.file.originalname,
    );
    res.json(training);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: error.message || "Failed to upload certificate file" });
  }
}

export async function deleteCertFile(req, res) {
  try {
    const training = await service.deleteTrainingCertFile(
      req.params.trainingId,
    );
    res.json(training);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: error.message || "Failed to delete certificate file" });
  }
}

export async function createMedicalExam(req, res) {
  try {
    const record = await service.createMedicalExam(req.params.id, req.body);
    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create medical exam record" });
  }
}

export async function updateMedicalExam(req, res) {
  try {
    const record = await service.updateMedicalExam(req.params.examId, req.body);
    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update medical exam record" });
  }
}

export async function deleteMedicalExam(req, res) {
  try {
    await service.deleteMedicalExam(req.params.examId);
    res.json({ message: "Medical exam record deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete medical exam record" });
  }
}

// ════════════════════════════════════════════════════════════════
// Per-Worker Export — CV Summary / Roster History / Skill Matrix
// ════════════════════════════════════════════════════════════════
export async function workerCvSummary(req, res) {
  try {
    const data = await allocationService.getCvSummaryForWorker(req.params.id);
    if (!data) return res.status(404).json({ message: "Worker not found" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function workerRoster(req, res) {
  try {
    const data = await allocationService.getRosterForWorker(req.params.id);
    if (!data) return res.status(404).json({ message: "Worker not found" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function workerSkillMatrix(req, res) {
  try {
    const { contractId } = req.query;
    const data = await allocationService.getSkillMatrixForWorker(
      req.params.id,
      contractId,
    );
    if (!data)
      return res.status(404).json({
        message: "No matrix found (worker/position missing, or no matrix set)",
      });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
