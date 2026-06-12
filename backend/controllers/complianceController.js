import * as service from "../services/complianceService.js";

export async function getComplianceDashboard(req, res) {
  try {
    const data = await service.getComplianceDashboard();

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
}

export async function getWorkerGap(req, res) {
  try {
    const data = await service.getWorkerGap(req.params.id);

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
}

export async function getComplianceStats(req, res) {
  try {
    const stats = await service.getComplianceStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function getWorkerAlerts(req, res) {
  try {
    const data = await service.getWorkerAlerts(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
