import express from "express";
import * as controller from "../controllers/allocationController.js";

const router = express.Router();

router.get("/projects", controller.getProjects);
router.get("/project/:id", controller.getProjectDetail);
router.get("/workers", controller.findWorkers);
router.get("/shortlist/:projectId", controller.getShortlist);
router.post("/shortlist", controller.addToShortlist);
router.put("/approve", controller.approveWorkers);
router.put("/unapprove", controller.unapproveWorkers);
router.delete("/candidate/:candidateId", controller.removeFromShortlist);
router.get("/eligibility/:employeeId", controller.getWorkerEligibility);
router.get("/cv-summary/:projectId", controller.cvSummary);

export default router;
