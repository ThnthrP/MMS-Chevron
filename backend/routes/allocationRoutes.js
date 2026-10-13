import express from "express";
import * as controller from "../controllers/allocationController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// ต้อง login ก่อนถึงจะเรียก route ใดๆ ในไฟล์นี้ได้
router.use(userAuth);

// ── Read ──
router.get("/projects", controller.getProjects);
router.get("/project/:id", controller.getProjectDetail);
router.get("/workers", controller.findWorkers);
router.get("/shortlist/:projectId", controller.getShortlist);
router.get("/eligibility/:employeeId", controller.getWorkerEligibility);

// ── Write — ยกเลิกจำกัด role ──
router.post("/shortlist", controller.addToShortlist);
router.put("/approve", controller.approveWorkers);
router.put("/unapprove", controller.unapproveWorkers);
router.delete("/candidate/:candidateId", controller.removeFromShortlist);

// ── Export ──
router.get("/cv-summary/:projectId", controller.cvSummary);
router.get("/roster/:projectId", controller.roster);
router.get("/skill-matrix/:projectId", controller.skillMatrix);

export default router;
