import * as service from "../services/positionService.js";

export async function getPositions(req, res) {
  try {
    const positions = await service.getPositions();

    res.json(positions);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load positions",
    });
  }
}
