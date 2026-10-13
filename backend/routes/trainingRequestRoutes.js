import express from "express";
import * as controller from "../controllers/trainingRequestController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

router.get("/:id", controller.getBatch); // ทุก role login แล้วดูได้

// เปิดให้ทุก role ที่เข้าหน้า Allocation/Certifications ได้ ส่ง training request ได้
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
    "training_officer", // ← เพิ่ม (Certifications.jsx ให้ role นี้เข้าถึงด้วย)
  ),
  controller.createBatch,
);

// list ทั้งหมด — กลุ่ม HR เท่านั้น
router.get(
  "/",
  requireRole("admin", "hr_officer", "hr_supervisor", "training_officer"), // ← เพิ่มครบ 3
  controller.getAllBatches,
);

router.patch(
  "/:id",
  requireRole("admin", "hr_officer", "hr_supervisor", "training_officer"), // ← เพิ่มครบ 3
  controller.updateStatus,
);

export default router;
