import express from "express";
import userAuth from "../middleware/userAuth.js";
import authorize from "../middleware/authorize.js";
import { createSafetyCheck } from "../controllers/safetyController.js";

const router = express.Router();

router.post(
  "/check",
  userAuth,
  authorize("safety", "check"),
  createSafetyCheck
);

export default router;