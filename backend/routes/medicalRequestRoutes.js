import express from "express";
import * as controller from "../controllers/medicalRequestController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

router.get("/:id", controller.getBatch);

router.post(
  "/",
  requireRole(
    "admin",
    "manpower_supply",
    "hr_supervisor",
    "personal_record_officer",
    "hr_officer",
    "project_engineer",
    "safety_manager",
  ),
  controller.createBatch,
);

router.get("/", requireRole("admin", "hr_officer"), controller.getAllBatches);

router.patch(
  "/:id",
  requireRole("admin", "hr_officer"),
  controller.updateStatus,
);

export default router;
