import express from "express";
import * as controller from "../controllers/workerController.js";

const router = express.Router();

router.get("/", controller.getWorkers);
router.get("/next-code", controller.getNextEmpCode); // ← ต้องมาก่อน /:id
router.get("/divisions", controller.getDivisions); // ← ต้องมาก่อน /:id
router.get("/:id", controller.getWorkerById);
router.post("/", controller.createWorker);

router.post("/:id/passport", controller.createPassport);

router.post("/:id/trainings", controller.createTraining);
router.put("/:id/trainings/:trainingId", controller.updateTraining);
router.delete("/:id/trainings/:trainingId", controller.deleteTraining);

router.post("/:id/medical", controller.createMedical);
router.put("/:id/medical/:medicalId", controller.updateMedical);

router.put("/:id", controller.updateWorker);
router.delete("/:id", controller.deleteWorker);

export default router;
