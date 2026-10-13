import express from "express";
import * as controller from "../controllers/leaveRequestController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

// HR ทั้ง 4 ตำแหน่ง — อ้างอิงจาก "กำหนดสิทธิ์การเข้าถึง - Approval (R1) (2) - MMS - HR.pdf"
const LEAVE_AUTHORIZED_ROLES = [
  "hr_supervisor",
  "personal_record_officer",
  "hr_officer",
  "training_officer",
];

router.get(
  "/",
  requireRole(...LEAVE_AUTHORIZED_ROLES),
  controller.getLeaveRequests,
);
router.get(
  "/:id",
  requireRole(...LEAVE_AUTHORIZED_ROLES),
  controller.getLeaveRequestDetail,
);
router.patch(
  "/:id/approve",
  requireRole(...LEAVE_AUTHORIZED_ROLES),
  controller.approveLeaveRequest,
);
router.patch(
  "/:id/reject",
  requireRole(...LEAVE_AUTHORIZED_ROLES),
  controller.rejectLeaveRequest,
);

export default router;
