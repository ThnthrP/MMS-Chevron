import * as service from "../services/dashboardService.js";

// GET /api/dashboard
export async function getDashboard(req, res) {
  try {
    const data = await service.getDashboard();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// GET /api/dashboard/alerts/:trainingName
export async function getAlertsByTraining(req, res) {
  try {
    const trainingName = decodeURIComponent(req.params.trainingName);
    const data = await service.getAlertsByTraining(trainingName);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
