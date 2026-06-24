import express from "express";
import * as controller from "../controllers/mobilizationController.js";

const router = express.Router();

router.get("/:projectId", controller.getList);
router.post("/deploy", controller.deploy);
router.post("/undeploy", controller.undeploy);

export default router;
