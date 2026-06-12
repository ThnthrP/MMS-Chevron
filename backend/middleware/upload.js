import multer from "multer";
import path from "path";

// ตั้งค่า storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // เก็บในโฟลเดอร์ uploads
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + ext);
  },
});

// filter (รับเฉพาะรูป)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

// 🔥 export
export const upload = multer({
  storage,
  fileFilter,
});