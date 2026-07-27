import express from "express";
import * as controller from "../controllers/workerController.js";
import { uploadPhotoMiddleware } from "../middleware/uploadPhotoMiddleware.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// ต้อง login ก่อนถึงจะเรียก route ใดๆ ในไฟล์นี้ได้
router.use(userAuth);

// ── Read — ทุก role ที่ login แล้วดูได้ (คุม role ระดับหน้าที่ frontend/AppRouter อยู่แล้ว) ──
router.get("/", controller.getWorkers);
router.get("/next-code", controller.getNextEmpCode); // ← ต้องมาก่อน /:id
router.get("/divisions", controller.getDivisions); // ← ต้องมาก่อน /:id
router.get("/:id", controller.getWorkerById);

// ── Write — เฉพาะ admin/hr ──
router.post("/", requireRole("admin", "hr"), controller.createWorker);

router.post(
  "/:id/passport",
  requireRole("admin", "hr"),
  controller.createPassport,
);

router.post(
  "/:id/photo",
  requireRole("admin", "hr"),
  uploadPhotoMiddleware.single("photo"),
  controller.uploadPhoto,
);

router.post(
  "/:id/trainings",
  requireRole("admin", "hr"),
  controller.createTraining,
);
router.put(
  "/:id/trainings/:trainingId",
  requireRole("admin", "hr"),
  controller.updateTraining,
);
router.delete(
  "/:id/trainings/:trainingId",
  requireRole("admin", "hr"),
  controller.deleteTraining,
);

router.post(
  "/:id/medical",
  requireRole("admin", "hr"),
  controller.createMedical,
);
router.put(
  "/:id/medical/:medicalId",
  requireRole("admin", "hr"),
  controller.updateMedical,
);
router.delete(
  "/:id/medical/:medicalId",
  requireRole("admin", "hr"),
  controller.deleteMedical,
);

// ── Past Deployment (Project References) — manual/historical entry ──
router.post(
  "/:id/deployments",
  requireRole("admin", "hr"),
  controller.createDeployment,
);
router.put(
  "/:id/deployments/:deploymentId",
  requireRole("admin", "hr"),
  controller.updateDeployment,
);
router.delete(
  "/:id/deployments/:deploymentId",
  requireRole("admin", "hr"),
  controller.deleteDeployment,
);

router.put("/:id", requireRole("admin", "hr"), controller.updateWorker);
router.delete("/:id", requireRole("admin", "hr"), controller.deleteWorker);

export default router;
