import express from "express";
import * as controller from "../controllers/workerController.js";

const router = express.Router();

router.get("/", controller.getWorkers);

router.get("/:id", controller.getWorkerById);

router.post("/", controller.createWorker);

router.post("/:id/passport", controller.createPassport);

router.put("/:id", controller.updateWorker);

router.delete("/:id", controller.deleteWorker);

export default router;
