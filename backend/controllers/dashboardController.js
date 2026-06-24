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