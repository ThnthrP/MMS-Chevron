import express from "express";
import * as controller from "../controllers/notificationController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.use(userAuth);

router.get("/", controller.getMine);
router.put("/:id/read", controller.markRead);
router.put("/read-all", controller.markAllRead);

export default router;
