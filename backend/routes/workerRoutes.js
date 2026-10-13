import express from "express";
import * as controller from "../controllers/workerController.js";
import { uploadPhotoMiddleware } from "../middleware/uploadPhotoMiddleware.js";
import userAuth from "../middleware/userAuth.js";

import { uploadCertMiddleware } from "../middleware/uploadCertMiddleware.js";

const router = express.Router();

// ต้อง login ก่อนถึงจะเรียก route ใดๆ ในไฟล์นี้ได้
router.use(userAuth);

// ── Read ──
router.get("/", controller.getWorkers);
router.get("/next-code", controller.getNextEmpCode);
router.get("/divisions", controller.getDivisions);
router.get("/health-risk-options", controller.getHealthRiskOptions);

router.get("/:id/cv-summary", controller.workerCvSummary);
router.get("/:id/roster-history", controller.workerRoster);
router.get("/:id/skill-matrix", controller.workerSkillMatrix);
router.get("/:id", controller.getWorkerById);

// ── Write — ยกเลิกจำกัด role ──
router.post("/", controller.createWorker);

router.post("/:id/passport", controller.createPassport);

router.post(
  "/:id/photo",
  uploadPhotoMiddleware.single("photo"),
  controller.uploadPhoto,
);

router.post("/:id/trainings", controller.createTraining);
router.put("/:id/trainings/:trainingId", controller.updateTraining);
router.delete("/:id/trainings/:trainingId", controller.deleteTraining);

router.post(
  "/:id/trainings/:trainingId/cert-file",
  uploadCertMiddleware.single("certFile"),
  controller.uploadCertFile,
);
router.delete(
  "/:id/trainings/:trainingId/cert-file",
  controller.deleteCertFile,
);

router.post("/:id/medical", controller.createMedical);
router.put("/:id/medical/:medicalId", controller.updateMedical);
router.delete("/:id/medical/:medicalId", controller.deleteMedical);

// ── Past Deployment (Project References) ──
router.post("/:id/deployments", controller.createDeployment);
router.put("/:id/deployments/:deploymentId", controller.updateDeployment);
router.delete("/:id/deployments/:deploymentId", controller.deleteDeployment);

router.post("/:id/medical-exam", controller.createMedicalExam);
router.put("/:id/medical-exam/:examId", controller.updateMedicalExam);
router.delete("/:id/medical-exam/:examId", controller.deleteMedicalExam);

router.put("/:id", controller.updateWorker);
router.delete("/:id", controller.deleteWorker);

export default router;
