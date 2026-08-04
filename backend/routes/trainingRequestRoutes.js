import express from "express";
import * as controller from "../controllers/trainingRequestController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
router.use(userAuth);

router.get("/:id", controller.getBatch); // ทุก role login แล้วดูได้
router.post("/", requireRole("admin", "manpower"), controller.createBatch);
router.get("/", requireRole("admin", "hr"), controller.getAllBatches); // ← เพิ่มใหม่ — list ทั้งหมด, HR/admin เท่านั้น

export default router;
