import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads", "leave-attachments");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // ตอน upload ยังไม่มี leaveRequestId (ยื่นพร้อมกันในคำขอเดียว) —
    // ใช้ employeeId + timestamp กัน collision แทน
    cb(null, `${req.employeeId}-${Date.now()}${ext}`);
  },
});

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(
      new Error(
        "รองรับเฉพาะไฟล์รูปภาพหรือ PDF (.jpg, .jpeg, .png, .webp, .pdf)",
      ),
    );
  }
  cb(null, true);
}

export const uploadLeaveAttachmentMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
