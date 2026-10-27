import express from "express";
import * as controller from "../controllers/medicalRequestController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";
import { getMedicalItems, getPendingMedicalKeys } from "../controllers/bookingListController.js";

const router = express.Router();
router.use(userAuth);

const REQUESTER_ROLES = [
  "admin",
  "manpower_supply",
  "hr_supervisor",
  "personal_record_officer",
  "hr_officer",
  "project_engineer",
  "safety_manager",
];
const HR_ROLES = ["admin", "hr_officer", "hr_supervisor"];

// ต้องอยู่ก่อน "/:id"
// รายการรายคน (หน้า Medical Bookings)
router.get("/items", requireRole(...HR_ROLES), getMedicalItems);
// คนที่แจ้ง HR ไปแล้ว (หน้า Compliance)
router.get("/pending-keys", requireRole(...REQUESTER_ROLES), getPendingMedicalKeys);

router.get("/:id", controller.getBatch);

router.post("/", requireRole(...REQUESTER_ROLES), controller.createBatch);

router.get("/", requireRole(...HR_ROLES), controller.getAllBatches);

router.patch("/:id", requireRole(...HR_ROLES), controller.updateStatus);
router.patch("/:id/items", requireRole(...HR_ROLES), controller.decideItems);

export default router;
