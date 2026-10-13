import express from "express";
import { getGlobalTrainings } from "../controllers/trainingMatrix.controller.js";

import {
  getContracts,
  getPositions,
  getRequirements,
  getPositionCounts, // ← เพิ่ม
} from "../controllers/trainingMatrix.controller.js";

import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.use(userAuth);

router.get("/contracts", getContracts);

router.get("/positions/:contractId", getPositions);

router.get("/requirements", getRequirements);

router.get("/global", getGlobalTrainings);

router.get("/contracts/:contractId/position-counts", getPositionCounts); // ← เพิ่ม

export default router;
