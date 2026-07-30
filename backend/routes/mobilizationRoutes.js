import express from "express";
import * as controller from "../controllers/mobilizationController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// ต้อง login ก่อนถึงจะเรียก route ใดๆ ในไฟล์นี้ได้
router.use(userAuth);

// ── Read — ทุก role ที่ login แล้วดูได้ (ตรงกับ sidebarMenu: admin, manpower, safety, nurse, ta) ──
router.get("/:projectId", controller.getList);

// ── Write — เฉพาะ admin/manpower ──
router.post("/deploy", requireRole("admin", "manpower"), controller.deploy);
router.post("/undeploy", requireRole("admin", "manpower"), controller.undeploy);
router.post(
  "/clear-project",
  requireRole("admin", "manpower"),
  controller.clearProject,
);

export default router;
