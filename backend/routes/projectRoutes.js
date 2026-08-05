import express from "express";
import * as controller from "../controllers/projectController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// ต้อง login ก่อนถึงจะเรียก route ใดๆ ในไฟล์นี้ได้
router.use(userAuth);

// ── Read — ทุก role ที่ login แล้วดูได้ (คุม role ระดับหน้าใน AppRouter อยู่แล้ว) ──
router.get("/", controller.getProjects);
router.get("/:id", controller.getProjectById);

// ── Write — เฉพาะ admin/pe ──
router.post("/", requireRole("admin", "pe"), controller.createProject);
router.put("/:id", requireRole("admin", "pe"), controller.updateProject);
router.delete("/:id", requireRole("admin", "pe"), controller.deleteProject);

router.post(
  "/:id/requests",
  requireRole("admin", "pe"),
  controller.addProjectRequest,
);

router.put(
  "/:id/requests/:requestId",
  requireRole("admin", "pe"),
  controller.updateProjectRequest,
);

router.delete(
  "/:id/requests/:requestId",
  requireRole("admin", "pe"),
  controller.deleteProjectRequest,
);

export default router;
