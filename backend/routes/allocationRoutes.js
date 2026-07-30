import express from "express";
import * as controller from "../controllers/allocationController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// ต้อง login ก่อนถึงจะเรียก route ใดๆ ในไฟล์นี้ได้
router.use(userAuth);

// ── Read — role ที่เกี่ยวข้องกับ Allocation ดูได้ (ตรงกับ sidebarMenu: admin, manpower, expert) ──
router.get("/projects", controller.getProjects);
router.get("/project/:id", controller.getProjectDetail);
router.get("/workers", controller.findWorkers);
router.get("/shortlist/:projectId", controller.getShortlist);
router.get("/eligibility/:employeeId", controller.getWorkerEligibility);

// ── Write — เฉพาะ admin/manpower (ตามที่ตกลงไว้สำหรับ Step 9: Shortlist & CV) ──
router.post(
  "/shortlist",
  requireRole("admin", "manpower"),
  controller.addToShortlist,
);
router.put(
  "/approve",
  requireRole("admin", "manpower"),
  controller.approveWorkers,
);
router.put(
  "/unapprove",
  requireRole("admin", "manpower"),
  controller.unapproveWorkers,
);
router.delete(
  "/candidate/:candidateId",
  requireRole("admin", "manpower"),
  controller.removeFromShortlist,
);

// ── Export — ก็เป็นส่วนของ Step 9 เหมือนกัน (Generate CV/Roster/Skill Matrix ปุ่มถูก gate ไว้แล้วฝั่ง frontend) ──
router.get(
  "/cv-summary/:projectId",
  requireRole("admin", "manpower"),
  controller.cvSummary,
);
router.get(
  "/roster/:projectId",
  requireRole("admin", "manpower"),
  controller.roster,
);
router.get(
  "/skill-matrix/:projectId",
  requireRole("admin", "manpower"),
  controller.skillMatrix,
);

export default router;
