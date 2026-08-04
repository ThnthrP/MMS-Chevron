import express from "express";
import * as controller from "../controllers/complianceController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

router.use(userAuth);

// ── Read — ทุก role ที่ login แล้วดูได้ ──
router.get("/dashboard", controller.getComplianceDashboard);
router.get("/certification/:id", controller.getCertificationDetail);
router.get("/worker/:id/gaps", controller.getWorkerGap);
router.get("/stats", controller.getComplianceStats);
router.get("/worker/:id/alerts", controller.getWorkerAlerts);

// ── Write — เฉพาะ admin/manpower (ตรงกับปุ่มที่ gate ไว้ใน Certifications.jsx) ──
router.post(
  "/request-training",
  requireRole("admin", "manpower"),
  controller.requestTraining,
);

export default router;
