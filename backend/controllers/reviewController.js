import * as service from "../services/reviewService.js";

// GET /api/review/projects
export async function getProjects(req, res) {
  try {
    const data = await service.getReviewProjects();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// GET /api/review/:projectId
export async function getDetail(req, res) {
  try {
    const data = await service.getReviewDetail(req.params.projectId);
    if (!data) return res.status(404).json({ message: "Project not found" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// POST /api/review
// body: { projectId, employeeId, rating, rehire, comment, reviewedById? }
export async function saveReview(req, res) {
  try {
    const { projectId, employeeId, rating, rehire, comment, reviewedById } =
      req.body;
    if (!projectId || !employeeId || !rating) {
      return res
        .status(400)
        .json({ message: "projectId, employeeId, rating are required" });
    }
    const data = await service.saveReview({
      projectId,
      employeeId,
      rating,
      rehire,
      comment,
      reviewedById,
    });
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// PUT /api/review/complete
// body: { projectId }
export async function complete(req, res) {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }
    const data = await service.completeProject({ projectId });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
