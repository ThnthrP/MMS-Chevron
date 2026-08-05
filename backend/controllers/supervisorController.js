import * as service from "../services/supervisorService.js";

export async function getProjectsOverview(req, res) {
  try {
    const data = await service.getProjectsOverview();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
