import express from "express";
import * as controller from "../controllers/matchExceptionController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.use(userAuth);

router.get("/", controller.list);
router.get("/pending-count", controller.pendingCount);
router.get("/request/:requestId", controller.forRequest);
router.post("/", controller.create);
// ตรวจ role (project_engineer / admin) อยู่ใน service.decide
router.put("/:id/decision", controller.decide);

export default router;
