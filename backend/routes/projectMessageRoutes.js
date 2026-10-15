import express from "express";
import * as controller from "../controllers/projectMessageController.js";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/requireRole.js";
import { uploadProjectAttachment } from "../middleware/uploadProjectAttachment.js";

// ── role ปัจจุบัน (ชื่อเก่า pe / pe_head / manpower ถูกลบออกจากระบบแล้ว) ──
// อ่าน: ทุก role ที่เข้าหน้า Project Detail ได้ (ตรงกับ AppRouter /projects/:id)
const READ_ROLES = [
  "admin",
  "project_engineer",
  "manpower_supply",
  "hr_supervisor",
  "personal_record_officer",
  "hr_officer",
  "training_officer",
  "safety_manager",
];
// ส่งข้อความ / แนบไฟล์: PE ↔ Manpower (+ admin)
const POST_ROLES = ["admin", "project_engineer", "manpower_supply"];

const router = express.Router();
router.use(userAuth);

router.get("/:projectId", requireRole(...READ_ROLES), controller.getMessages);

router.post(
  "/:projectId",
  requireRole(...POST_ROLES),
  uploadProjectAttachment.array("files", 5), // สูงสุด 5 ไฟล์ต่อข้อความ
  controller.createMessage,
);

export default router;
