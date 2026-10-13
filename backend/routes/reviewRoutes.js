import express from "express";
import * as controller from "../controllers/reviewController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

router.get("/projects", controller.getProjects);
router.get("/:projectId", controller.getDetail);

router.post("/", controller.saveReview);
router.put("/complete", controller.complete);

export default router;
