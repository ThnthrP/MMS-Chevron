import express from "express";
import * as controller from "../controllers/positionController.js";

const router = express.Router();

router.get("/", controller.getPositions);

export default router;
