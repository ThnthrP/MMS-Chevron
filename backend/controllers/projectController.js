import * as service from "../services/projectService.js";

export async function getProjects(req, res) {
  try {
    const projects = await service.getProjects();
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function getProjectById(req, res) {
  try {
    const project = await service.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function createProject(req, res) {
  try {
    const project = await service.createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create project" });
  }
}

export async function updateProject(req, res) {
  try {
    const project = await service.updateProject(req.params.id, req.body);
    res.json(project);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Project not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to update project" });
  }
}

export async function deleteProject(req, res) {
  try {
    await service.deleteProject(req.params.id);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete project" });
  }
}

export async function addProjectRequest(req, res) {
  try {
    const request = await service.addProjectRequest(req.params.id, req.body);
    res.status(201).json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add position request" });
  }
}

export async function deleteProjectRequest(req, res) {
  try {
    await service.deleteProjectRequest(req.params.id, req.params.requestId);
    res.json({ message: "Position request deleted successfully" });
  } catch (error) {
    // ส่งจาก service เมื่อมี booking ผูกอยู่
    if (error.code === "REQUEST_HAS_BOOKINGS") {
      return res.status(409).json({
        message:
          "ลบไม่ได้ — request นี้มีการ booking/shortlist พนักงานแล้ว ต้องยกเลิก booking ก่อน",
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Position request not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to delete position request" });
  }
}
