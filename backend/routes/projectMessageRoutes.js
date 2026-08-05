import express from "express";
import * as controller from "../controllers/projectMessageController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";
import { uploadProjectAttachment } from "../middleware/uploadProjectAttachment.js";

const router = express.Router();
router.use(userAuth);

router.get(
  "/:projectId",
  requireRole("admin", "pe", "pe_head", "manpower"),
  controller.getMessages,
);

router.post(
  "/:projectId",
  requireRole("admin", "pe", "manpower"),
  uploadProjectAttachment.array("files", 5), // สูงสุด 5 ไฟล์ต่อข้อความ
  controller.createMessage,
);

export default router;
