import express from "express";
import { getGlobalTrainings } from "../controllers/trainingMatrix.controller.js";

import {
  getContracts,
  getPositions,
  getRequirements,
} from "../controllers/trainingMatrix.controller.js";

const router = express.Router();

router.get("/contracts", getContracts);

router.get("/positions/:contractId", getPositions);

router.get("/requirements", getRequirements);

router.get("/global", getGlobalTrainings);

export default router;