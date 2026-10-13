import express from "express";
import * as controller from "../controllers/analyticsController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();
router.use(userAuth);

router.get("/", controller.getAnalytics);
router.get("/deployment", controller.getDeploymentReport); // ← เพิ่ม
router.get("/export-pe-tracking", controller.exportPeTracking);

export default router;
