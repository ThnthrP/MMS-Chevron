import * as service from "../services/globalTrainingService.js";

// ── Training Sources ──

// GET /api/global-trainings/sources
export async function listSources(req, res) {
  try {
    const data = await service.listTrainingSources();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// POST /api/global-trainings/sources
// body: { name, requiresClient }
export async function createSource(req, res) {
  try {
    const { name, requiresClient } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    const data = await service.createTrainingSource({ name, requiresClient });
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

// DELETE /api/global-trainings/sources/:id
export async function removeSource(req, res) {
  try {
    await service.deleteTrainingSource(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

// ── Global Trainings ──

// GET /api/global-trainings?search=...
export async function list(req, res) {
  try {
    const data = await service.listGlobalTrainings(req.query.search);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// GET /api/global-trainings/:id
export async function getOne(req, res) {
  try {
    const data = await service.getGlobalTrainingDetail(req.params.id);
    if (!data) return res.status(404).json({ message: "Training not found" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// POST /api/global-trainings
// body: { name, fullName, description }
export async function create(req, res) {
  try {
    const { name, fullName, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }
    const data = await service.createGlobalTraining({
      name,
      fullName,
      description,
    });
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "มี training ชื่อนี้อยู่แล้ว (name ต้องไม่ซ้ำ)" });
    }
    res.status(500).json({ message: error.message });
  }
}

// PUT /api/global-trainings/:id
export async function update(req, res) {
  try {
    const { name, fullName, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }
    const data = await service.updateGlobalTraining(req.params.id, {
      name,
      fullName,
      description,
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "มี training ชื่อนี้อยู่แล้ว (name ต้องไม่ซ้ำ)" });
    }
    res.status(500).json({ message: error.message });
  }
}

// DELETE /api/global-trainings/:id
export async function remove(req, res) {
  try {
    await service.deleteGlobalTraining(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

// POST /api/global-trainings/:id/standards
// body: { sourceId, clientId, trainingHours, validityDays, isNoExpiry }
export async function createStandard(req, res) {
  try {
    const { sourceId, clientId, trainingHours, validityDays, isNoExpiry } =
      req.body;
    if (!sourceId) {
      return res.status(400).json({ message: "sourceId is required" });
    }
    const data = await service.createTrainingStandard(req.params.id, {
      sourceId,
      clientId,
      trainingHours,
      validityDays,
      isNoExpiry,
    });
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

// PUT /api/global-trainings/:id/standards/:standardId
export async function updateStandard(req, res) {
  try {
    const { sourceId, clientId, trainingHours, validityDays, isNoExpiry } =
      req.body;
    if (!sourceId) {
      return res.status(400).json({ message: "sourceId is required" });
    }
    const data = await service.updateTrainingStandard(req.params.standardId, {
      sourceId,
      clientId,
      trainingHours,
      validityDays,
      isNoExpiry,
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

// DELETE /api/global-trainings/:id/standards/:standardId
export async function removeStandard(req, res) {
  try {
    await service.deleteTrainingStandard(req.params.standardId);
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}
