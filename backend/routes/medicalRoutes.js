import express from "express";
import userAuth from "../middleware/userAuth.js";
import authorize from "../middleware/authorize.js";
import { createMedicalCheck } from "../controllers/medicalController.js";

const router = express.Router();

// 🏥 สร้าง medical check
router.post(
  "/check",
  userAuth,
  authorize("medical", "check"),
  createMedicalCheck
);

export default router;