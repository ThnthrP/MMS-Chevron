import express from "express";
import * as controller from "../controllers/workerController.js";
import { uploadPhotoMiddleware } from "../middleware/uploadPhotoMiddleware.js"; // ← เพิ่มบรรทัดนี้ตอน import

const router = express.Router();

router.get("/", controller.getWorkers);
router.get("/next-code", controller.getNextEmpCode); // ← ต้องมาก่อน /:id
router.get("/divisions", controller.getDivisions); // ← ต้องมาก่อน /:id
router.get("/:id", controller.getWorkerById);
router.post("/", controller.createWorker);

router.post("/:id/passport", controller.createPassport);

// ... แทรกใกล้ๆ กลุ่ม /:id/passport, /:id/trainings ...
router.post(
  "/:id/photo",
  uploadPhotoMiddleware.single("photo"),
  controller.uploadPhoto,
);

router.post("/:id/trainings", controller.createTraining);
router.put("/:id/trainings/:trainingId", controller.updateTraining);
router.delete("/:id/trainings/:trainingId", controller.deleteTraining);

router.post("/:id/medical", controller.createMedical);
router.put("/:id/medical/:medicalId", controller.updateMedical);

// ── Past Deployment (Project References) — manual/historical entry ──
router.post("/:id/deployments", controller.createDeployment);
router.put("/:id/deployments/:deploymentId", controller.updateDeployment);
router.delete("/:id/deployments/:deploymentId", controller.deleteDeployment);

router.put("/:id", controller.updateWorker);
router.delete("/:id", controller.deleteWorker);

router.delete("/:id/medical/:medicalId", controller.deleteMedical);

export default router;
