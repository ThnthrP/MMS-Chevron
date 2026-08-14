import express from "express";
import * as controller from "../controllers/mobilizationController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";
import requireRoleOrPermission from "../middleware/requireRoleOrPermission.js";
import { uploadMobilizationPhoto } from "../middleware/uploadMobilizationPhoto.js"; // ← เพิ่ม

const router = express.Router();

router.use(userAuth);

// ── Read — ทุก role ที่ login แล้วดูได้ ──
router.get("/:projectId", controller.getList);

// ── Write: checklist — admin/manpower ผ่านเหมือนเดิม
//    + safety/nurse ผ่านได้ถ้ามี permission "mobilization_checklist:update" ──
router.patch(
  "/task/:taskId",
  requireRoleOrPermission("mobilization_checklist:update", "admin", "manpower"),
  controller.updateChecklistItem,
);

// ── Write: photo attachment — ใช้สิทธิ์เดียวกับ checklist update ── ← เพิ่มใหม่
router.post(
  "/task/:taskId/photo",
  requireRoleOrPermission("mobilization_checklist:update", "admin", "manpower"),
  uploadMobilizationPhoto.single("photo"),
  controller.uploadTaskPhoto,
);
router.delete(
  "/task/:taskId/photo",
  requireRoleOrPermission("mobilization_checklist:update", "admin", "manpower"),
  controller.removeTaskPhoto,
);

// ── Write: deploy/undeploy — คงเป็น admin/manpower เท่านั้น (ขั้นตอนสุดท้ายก่อนลงแท่น) ──
router.post("/deploy", requireRole("admin", "manpower"), controller.deploy);
router.post("/undeploy", requireRole("admin", "manpower"), controller.undeploy);
router.post(
  "/clear-project",
  requireRole("admin", "manpower"),
  controller.clearProject,
);

export default router;
