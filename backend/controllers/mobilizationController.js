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

// PATCH /api/mobilization/task/:taskId
// body: { resultStatus?: "pass"|"fail"|"not_applicable", measuredValue?, itemsChecked?, notes? }
//   resultStatus เป็น optional ตอนนี้ — รองรับ partial update
//   (เช่น ติ๊ก checkbox บางส่วนโดยยังไม่ auto-Pass จนกว่าจะครบ)
export async function updateChecklistItem(req, res) {
  try {
    const { taskId } = req.params;
    const { resultStatus, measuredValue, itemsChecked, notes } = req.body;

    // validate เฉพาะตอนที่ "มีการส่ง resultStatus มาจริง" เท่านั้น
    if (
      resultStatus !== undefined &&
      resultStatus !== null &&
      !["pass", "fail", "not_applicable"].includes(resultStatus)
    ) {
      return res.status(400).json({ message: "Invalid resultStatus" });
    }

    const task = await service.updateChecklistTask(taskId, {
      resultStatus,
      measuredValue,
      itemsChecked,
      notes,
      userId: req.userId,
      userName: req.user.name,
    });
    res.json(task);
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

// POST /api/mobilization/clear-project
// body: { projectId }
// ⚠ DEV TOOL — ลบ Assignment ทั้งหมดของ project ทิ้ง (ไม่ใช่ undeploy ทีละคน)
export async function clearProject(req, res) {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }
    const result = await service.clearProjectDeployments(projectId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// POST /api/mobilization/task/:taskId/photo
// multipart/form-data — field name "photo"
export async function uploadTaskPhoto(req, res) {
  try {
    const { taskId } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "ไม่พบไฟล์รูปภาพ" });
    }
    const photoPath = `/uploads/mobilization/${req.file.filename}`;
    const task = await service.addTaskPhoto(taskId, photoPath);
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบ task นี้" });
    }
    res.status(500).json({ message: error.message });
  }
}

// DELETE /api/mobilization/task/:taskId/photo
// body: { photoPath }
export async function removeTaskPhoto(req, res) {
  try {
    const { taskId } = req.params;
    const { photoPath } = req.body;
    if (!photoPath) {
      return res.status(400).json({ message: "photoPath is required" });
    }
    const task = await service.removeTaskPhoto(taskId, photoPath);
    res.json(task);
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบ task นี้" });
    }
    res.status(500).json({ message: error.message });
  }
}
