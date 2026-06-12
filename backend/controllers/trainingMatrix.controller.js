import * as service from "../services/trainingMatrix.service.js";

export async function getContracts(req, res) {
  const data = await service.getContracts();

  res.json(data);
}

export async function getPositions(req, res) {
  const { contractId } = req.params;

  const data = await service.getPositionsByContract(contractId);

  res.json(data);
}

export async function getRequirements(req, res) {
  const { contractId, positionId } = req.query;

  const data = await service.getRequirements(contractId, positionId);

  res.json(data);
}

export async function getGlobalTrainings(req, res) {
  try {
    const data = await service.getGlobalTrainings();

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load global trainings",
    });
  }
}
