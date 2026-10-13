import * as service from "../services/clientTrainingService.js";

export async function getAvailable(req, res) {
  try {
    const data = await service.getAvailableGlobalTrainings(
      req.params.contractId,
      req.query.search,
    );
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load available trainings" });
  }
}

export async function link(req, res) {
  try {
    const { globalTrainingId, trainingStandardId, nameAlias } = req.body;
    if (!globalTrainingId || !trainingStandardId) {
      return res
        .status(400)
        .json({ message: "globalTrainingId และ trainingStandardId จำเป็น" });
    }
    const data = await service.linkGlobalTraining(
      req.params.contractId,
      globalTrainingId,
      trainingStandardId,
      nameAlias,
    );
    res.status(201).json(data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Link failed" });
  }
}

export async function unlink(req, res) {
  try {
    await service.unlinkClientTraining(req.params.id);
    res.json({ message: "Unlinked" });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Unlink failed" });
  }
}
