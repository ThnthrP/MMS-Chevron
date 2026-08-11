import express from "express";
import * as controller from "../controllers/supervisorController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

router.get(
  "/projects-overview",
  requireRole(
    "admin",
    "supervisor",
    "executive",
    "manager",
    "pe_head",
    "manpower",
    "hr",
    "pe", // ← ยังไม่เคยเพิ่ม ต้องใส่ตอนนี้
    "bd", // ← ใหม่
  ),
  controller.getProjectsOverview,
);

export default router;
