import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads", "photos");

// สร้างโฟลเดอร์ถ้ายังไม่มี (กัน error ตอน deploy ครั้งแรก / container ใหม่)
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const employeeId = req.params.id;
    // ตั้งชื่อไฟล์ผูกกับ employeeId + timestamp กัน collision และ cache ค้าง
    cb(null, `${employeeId}-${Date.now()}${ext}`);
  },
});

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error("รองรับเฉพาะไฟล์รูปภาพ (.jpg, .jpeg, .png, .webp)"));
  }
  cb(null, true);
}

export const uploadPhotoMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
