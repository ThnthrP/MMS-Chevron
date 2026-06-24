import * as service from "../services/allocationService.js";

export async function getProjects(req, res) {
  try {
    const projects = await service.getProjectsForDropdown();
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function getProjectDetail(req, res) {
  try {
    const detail = await service.getProjectAllocationDetail(req.params.id);
    if (!detail) return res.status(404).json({ message: "Project not found" });
    res.json(detail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// GET /api/allocation/workers?positionId=&requestId=&contractId=
export async function findWorkers(req, res) {
  try {
    const { positionId, requestId, contractId } = req.query;
    const workers = await service.findWorkers({
      positionId,
      requestId,
      contractId,
    });
    res.json(workers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function getShortlist(req, res) {
  try {
    const shortlist = await service.getShortlist(req.params.projectId);
    res.json(shortlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function addToShortlist(req, res) {
  try {
    const { requestId, employeeIds } = req.body;
    if (!requestId || !employeeIds?.length) {
      return res
        .status(400)
        .json({ message: "requestId and employeeIds are required" });
    }
    const result = await service.addToShortlist({ requestId, employeeIds });
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function approveWorkers(req, res) {
  try {
    const { candidateIds, requestId } = req.body;
    if (!candidateIds?.length) {
      return res.status(400).json({ message: "candidateIds are required" });
    }
    const result = await service.approveWorkers({ candidateIds, requestId });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// PUT /api/allocation/unapprove — ยกเลิก approve กลับเป็น proposed
export async function unapproveWorkers(req, res) {
  try {
    const { candidateIds, requestId } = req.body;
    if (!candidateIds?.length) {
      return res.status(400).json({ message: "candidateIds are required" });
    }
    const result = await service.unapproveWorkers({ candidateIds, requestId });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function removeFromShortlist(req, res) {
  try {
    await service.removeFromShortlist(req.params.candidateId);
    res.json({ message: "Removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function getWorkerEligibility(req, res) {
  try {
    const data = await service.getWorkerEligibility(req.params.employeeId);
    if (!data) return res.status(404).json({ message: "Worker not found" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// GET /api/allocation/cv-summary/:projectId
export async function cvSummary(req, res) {
  try {
    const data = await service.getCvSummary(req.params.projectId);
    if (!data) return res.status(404).json({ message: "Project not found" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
