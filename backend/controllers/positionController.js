import * as service from "../services/positionService.js";

export async function getPositions(req, res) {
  try {
    const positions = await service.getPositions();
    res.json(positions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load positions" });
  }
}

export async function getPositionsWithCounts(req, res) {
  try {
    const positions = await service.getPositionsWithCounts();
    res.json(positions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load positions" });
  }
}

export async function getPositionById(req, res) {
  try {
    const position = await service.getPositionById(req.params.id);
    if (!position)
      return res.status(404).json({ message: "Position not found" });
    res.json(position);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load position" });
  }
}

export async function createPosition(req, res) {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: "Position name is required." });
    }
    const position = await service.createPosition(req.body);
    res.status(201).json(position);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: `Position "${req.body.name}" already exists.` });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to create position" });
  }
}

export async function updatePosition(req, res) {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: "Position name is required." });
    }
    const position = await service.updatePosition(req.params.id, req.body);
    res.json(position);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: `Position "${req.body.name}" already exists.` });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Position not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to update position" });
  }
}

export async function deletePosition(req, res) {
  try {
    await service.deletePosition(req.params.id);
    res.json({ message: "Position deleted" });
  } catch (error) {
    if (error.code === "POSITION_IN_USE") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Position not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to delete position" });
  }
}

// ===== Phase B — Matrix Editor =====

export async function getPositionMatrix(req, res) {
  try {
    const { contractId } = req.query;
    if (!contractId) {
      return res.status(400).json({ message: "contractId is required" });
    }
    const data = await service.getPositionMatrix(req.params.id, contractId);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load position matrix" });
  }
}

export async function updatePositionMatrix(req, res) {
  try {
    const { contractId, items } = req.body;
    if (!contractId) {
      return res.status(400).json({ message: "contractId is required" });
    }
    const data = await service.replacePositionMatrix(
      req.params.id,
      contractId,
      Array.isArray(items) ? items : [],
    );
    res.json(data);
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({
        message: "Invalid reference (position / clientTraining / contract)",
      });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to update position matrix" });
  }
}
