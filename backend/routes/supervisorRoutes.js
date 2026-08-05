import express from "express";
import * as controller from "../controllers/supervisorController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

router.get(
  "/projects-overview",
  requireRole("admin", "supervisor", "executive", "manager", "pe_head"),
  controller.getProjectsOverview,
);

export default router;
