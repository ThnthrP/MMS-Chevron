import express from "express";
import * as controller from "../controllers/employeeBanController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

// จำกัดเฉพาะคนมีอำนาจ — ปรับ role ตามที่ต้องการจริง
// const BAN_AUTHORIZED_ROLES = ["admin", "hr_supervisor", "safety_manager"];

// ── Write: ban/lift-ban — ยกเลิกจำกัด role ──
router.post(
  "/:id/ban",
  // requireRole(...BAN_AUTHORIZED_ROLES),
  controller.banEmployee,
);
router.patch(
  "/ban/:banId/lift",
  // requireRole(...BAN_AUTHORIZED_ROLES),
  controller.liftBan,
);
router.get("/:id/ban-history", controller.getBanHistory);

export default router;
