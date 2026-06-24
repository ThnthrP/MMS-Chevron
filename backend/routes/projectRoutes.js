import express from "express";
import * as controller from "../controllers/projectController.js";

const router = express.Router();

router.get("/", controller.getProjects);
router.get("/:id", controller.getProjectById);
router.post("/", controller.createProject);
router.put("/:id", controller.updateProject);
router.delete("/:id", controller.deleteProject);
router.post("/:id/requests", controller.addProjectRequest);
router.delete("/:id/requests/:requestId", controller.deleteProjectRequest);

export default router;
