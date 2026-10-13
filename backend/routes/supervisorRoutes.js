import express from "express";
import * as controller from "../controllers/supervisorController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();
router.use(userAuth);

router.get("/projects-overview", controller.getProjectsOverview);

export default router;
