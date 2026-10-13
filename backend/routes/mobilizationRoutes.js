import express from "express";
import * as controller from "../controllers/mobilizationController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";
import { uploadMobilizationPhoto } from "../middleware/uploadMobilizationPhoto.js";

const router = express.Router();

router.use(userAuth);

// ── Read — ทุก role ที่ login แล้วดูได้ ──
router.get("/:projectId", controller.getList);

// ── Write: checklist — ยกเลิกจำกัด role ──
router.patch("/task/:taskId", controller.updateChecklistItem);

// ── Write: photo attachment ──
router.post(
  "/task/:taskId/photo",
  uploadMobilizationPhoto.single("photo"),
  controller.uploadTaskPhoto,
);
router.delete("/task/:taskId/photo", controller.removeTaskPhoto);

// ── Write: deploy/undeploy — ยกเลิกจำกัด role ──
router.post("/deploy", controller.deploy);
router.post("/undeploy", controller.undeploy);

// ── Dev tool — จำกัดเฉพาะ admin เท่านั้น ──
router.post("/clear-project", requireRole("admin"), controller.clearProject);

router.post("/task/:taskId/ban", controller.banFromChecklist);
// router.post(
//   "/task/:taskId/ban",
//   requireRole("admin", "hr_supervisor", "safety_manager"),
//   controller.banFromChecklist,
// );

router.post("/no-show", controller.banNoShow);

export default router;
