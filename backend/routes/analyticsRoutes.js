import express from "express";
import * as controller from "../controllers/analyticsController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();
router.use(userAuth);

router.get("/", controller.getAnalytics);

export default router;
