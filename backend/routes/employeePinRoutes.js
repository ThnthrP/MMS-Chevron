import express from "express";
import * as controller from "../controllers/employeePinController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

// จำกัดเฉพาะคนมีอำนาจ — ปรับ role ตามที่ต้องการจริง (เหมือน employeeBanRoutes)
// const PIN_AUTHORIZED_ROLES = ["admin", "hr_supervisor"];

router.post(
  "/:id/set-pin",
  // requireRole(...PIN_AUTHORIZED_ROLES),
  controller.setEmployeePin,
);
router.post(
  "/:id/unlock-pin",
  // requireRole(...PIN_AUTHORIZED_ROLES),
  controller.unlockEmployeePin,
);
router.get("/:id/pin-status", controller.getEmployeePinStatus);

router.post("/bulk-set-pin", requireRole("admin"), controller.bulkSetPins);

export default router;
