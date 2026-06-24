import express from "express";
import * as controller from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/", controller.getAnalytics);

export default router;
