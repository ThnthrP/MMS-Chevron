import * as service from "../services/workerService.js";

export async function getWorkers(req, res) {
  try {
    const workers = await service.getWorkers();
    res.json(workers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

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
