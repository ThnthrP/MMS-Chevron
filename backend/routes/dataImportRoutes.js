// ============================================================
// routes/dataImportRoutes.js — นำเข้าข้อมูลจาก Excel (admin only)
// mount: app.use("/api/admin/import", dataImportRoutes);
// ============================================================
import express from "express";
import multer from "multer";
import path from "path";
import userAuth from "../middleware/userAuth.js";
import { requireAdmin } from "../controllers/auditLogController.js";
import { importEmployeeTrainings, importPeTracking } from "../controllers/dataImportController.js";

const router = express.Router();

// memoryStorage → ไฟล์ไม่ถูกเขียนลง disk ของ server
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if ([".xlsx", ".xls"].includes(ext)) return cb(null, true);
    cb(new Error("รองรับเฉพาะไฟล์ .xlsx / .xls"));
  },
});

// ห่อ multer เพื่อตอบ error เป็น JSON แทน error page
const singleExcel = (req, res, next) =>
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "ไฟล์ใหญ่เกิน 20MB" : err.message || "อัปโหลดไม่สำเร็จ";
    return res.status(400).json({ success: false, message });
  });

router.use(userAuth, requireAdmin);

router.post("/employee-trainings", singleExcel, importEmployeeTrainings);
router.post("/pe-tracking", singleExcel, importPeTracking);

export default router;
