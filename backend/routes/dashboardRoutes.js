import express from "express";
import * as controller from "../controllers/dashboardController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();
router.use(userAuth);

router.get("/", controller.getDashboard);

export default router;
