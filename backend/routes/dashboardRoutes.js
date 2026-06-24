import express from "express";
import * as controller from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", controller.getDashboard);

export default router;
