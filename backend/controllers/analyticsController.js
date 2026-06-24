import * as service from "../services/analyticsService.js";

// GET /api/analytics
export async function getAnalytics(req, res) {
  try {
    const data = await service.getAnalytics();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
