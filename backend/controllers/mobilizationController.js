import * as service from "../services/mobilizationService.js";

// GET /api/mobilization/:projectId
export async function getList(req, res) {
  try {
    const data = await service.getMobilizationList(req.params.projectId);
    if (!data) return res.status(404).json({ message: "Project not found" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// POST /api/mobilization/deploy
// body: { projectId, deployments: [{ employeeId, mobDate, platform }] }
export async function deploy(req, res) {
  try {
    const { projectId, deployments } = req.body;
    if (!projectId || !deployments?.length) {
      return res
        .status(400)
        .json({ message: "projectId and deployments are required" });
    }
    const result = await service.deployToSite({ projectId, deployments });
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// POST /api/mobilization/undeploy
// body: { projectId, employeeId }
export async function undeploy(req, res) {
  try {
    const { projectId, employeeId } = req.body;
    if (!projectId || !employeeId) {
      return res
        .status(400)
        .json({ message: "projectId and employeeId are required" });
    }
    const result = await service.undeployWorker({ projectId, employeeId });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
