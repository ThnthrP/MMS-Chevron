import express from "express";
import * as controller from "../controllers/reviewController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

router.get("/projects", controller.getProjects);
router.get("/:projectId", controller.getDetail);

// เขียนข้อมูล (สร้าง/แก้ไข review) — เฉพาะ role ที่มีสิทธิ์จริงจาก sidebar
router.post(
  "/",
  requireRole("admin", "hr", "pe", "pe_head", "manpower"),
  controller.saveReview,
);
router.put(
  "/complete",
  requireRole("admin", "hr", "pe", "pe_head", "manpower"),
  controller.complete,
);

export default router;
