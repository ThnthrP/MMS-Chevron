import express from "express";
import * as controller from "../controllers/reviewController.js";

const router = express.Router();

router.get("/projects", controller.getProjects);
router.get("/:projectId", controller.getDetail);
router.post("/", controller.saveReview);
router.put("/complete", controller.complete);

export default router;
