import express from "express";
import * as controller from "../controllers/complianceController.js";

const router = express.Router();

router.get("/dashboard", controller.getComplianceDashboard);

router.get("/worker/:id/gaps", controller.getWorkerGap);

router.get("/stats", controller.getComplianceStats);

router.get("/worker/:id/alerts", controller.getWorkerAlerts);

export default router;
