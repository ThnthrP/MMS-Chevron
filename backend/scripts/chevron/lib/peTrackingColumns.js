// ============================================================
// scripts/common/lib/peTrackingColumns.js
//
// คอลัมน์ไฟล์ PE tracking (layout ใหม่ A..AU — 47 คอลัมน์) + หัวคอลัมน์ 3 ภาษา
// ใช้โดย:
//   - scripts/common/exportMedicalExamRecordsToPETracking.js (CLI)
//   - controllers/analyticsController.js (ปุ่ม ⬇ Export PE Tracking ในหน้า Compliance Center)
//
// ตัวนำเข้า (services/peTrackingImportService.js) หาคอลัมน์จาก "คำในหัว" ไม่ใช่ตำแหน่ง
// → ไฟล์ที่ export ออกไปแล้ว HR แก้ไข สามารถนำเข้ากลับได้
//
// ค่าคำนวณ (ไม่เก็บใน DB):
//   AL/AM  จากวันที่ลง Comment (AK) + 90 วัน   → ใส่เป็นค่า
//   AS/AT  จากวันที่ตรวจ (K) + 364 วัน          → ใส่เป็นสูตร Excel เดิมของ HR (ค่าอัปเดตเองทุกวัน)
// col D (บริษัท) → ระบบเป็น single-company — ใช้ COMPANY_NAME
// col B/C → DB เก็บ fullNameEN รวม — แยกคำแรกเป็นชื่อ ที่เหลือเป็นนามสกุล
// ============================================================

export const COMPANY_NAME = "Experteam Co.Ltd.";

// [excelColumnLetter, header (บรรทัดคั่นด้วย \n)]
export const PE_TRACKING_COLUMNS = [
  ["A", "ชื่อ-นามสกุล"],
  ["B", "ชื่อ\nFirst Name and Middle Name\n名字"],
  ["C", "นามสกุลเต็ม\nFull Surname\n全姓"],
  ["D", "บริษัท\nCompany\n公司"],
  ["E", "สถานที่ทำงานในพื้นที่เชฟรอน\nChevron Workplace\n雪佛龙工作场所"],
  ["F", "ตำแหน่ง"],
  ["G", "แผนก"],
  ["H", "วัน เดือน ปี เกิด\nDate of Birth (MM/DD/YYYY)\n出生日期"],
  ["I", "อายุ (ปี)\nAge (year)\n年龄 (年)"],
  ["J", "โรคประจำตัว\nUnderlying disease\n基础疾病"],
  ["K", "วันที่ตรวจร่างกาย\nDate of physical examination (MM/DD/YYYY)\n体检日期"],
  ["L", "ส่วนสูง (เซนติเมตร)\nHeight (cm)\n身高 (厘米)"],
  ["M", "น้ำหนัก (กิโลกรัม)\nWeight (kg)\n体重 (公斤)"],
  ["N", "ดัชนีมวลกาย\nBody mass index (BMI)\n身体质量指数"],
  ["O", "ความดันตัวบน\nSystolic blood pressure (SBP)\n收缩压"],
  ["P", "ความดันตัวล่าง\nDiastolic blood pressure (DBP)\n舒张压"],
  ["Q", "ความเข้มข้นของเลือด (%)\nHematocrit (Hct) (%)\n红细胞比容"],
  ["R", "ผลการตรวจปัสสาวะ\nUrine analysis (UA)\n尿检"],
  ["S", "รายละเอียดความผิดปกติของผลปัสสาวะ"],
  ["T", "น้ำตาลในเลือด\nFasting blood sugar (FBS)\n空腹血糖"],
  ["U", "ไขมันไม่ดี\nLDL-Cholesterol\n低密度脂蛋白胆固醇"],
  ["V", "ไขมันไตรกลีเซอไรด์\nTriglyceride\n甘油三酸酯"],
  ["W", "เอ็นไซม์ตับ SGOT (AST)\n血清天门冬氨酸氨基转移酶"],
  ["X", "เอ็นไซม์ตับ SGPT (ALT)\n血清丙氨酸氨基转移酶"],
  ["Y", "กรดยูริค\nUric acid\n血清尿酸"],
  ["Z", "คลื่นไฟฟ้าหัวใจ\nElectrocardiogram (EKG, ECG)\n心电图"],
  ["AA", "รายละเอียดความผิดปกติของคลื่นไฟฟ้าหัวใจ"],
  ["AB", "เอ็กซ์เรย์ปอด\nChest x-ray\n胸部X光片"],
  ["AC", "รายละเอียดความผิดปกติของเอ็กซเรย์ปอด"],
  ["AD", "ผลตรวจฟัน\nDental examination result\n牙科检查结果"],
  ["AE", "รายละเอียดความผิดปกติของผลตรวจฟัน"],
  ["AF", "EST (อายุ55ปี)"],
  ["AG", "รายละเอียดความผิดปกติของ EST"],
  ["AH", "หมายเหตุ\nNote\n注释"],
  ["AI", "Health Risk"],
  ["AJ", "Recommendation"],
  ["AK", "วันที่ลง Comment"],
  ["AL", "วันที่ต้องติดตาม"],
  ["AM", "ระยะเวลาที่ต้องอัพเดท (วัน)"],
  ["AN", "เรื่องที่ต้องติดตาม"],
  ["AO", "แจ้งเมื่อมีให้ติดตาม"],
  ["AP", "แจ้งซ้ำก่อนกำหนด 1 เดือน ติดตาม"],
  ["AQ", "แจ้งซ้ำเมื่อเลยกำหนดติดตาม"],
  ["AR", "กำหนดการติดตาม"],
  ["AS", "สถานะวันหมดอายุ"],
  ["AT", "ระยะเวลาที่จะหมดอายุ (วัน)"],
  ["AU", "กำหนดการตรวจครั้งถัดไป"],
];

export const DATE_FMT = "dd-mmm-yyyy";
export const DATE_COLS = ["H", "K", "AK", "AU"];

// healthRisk ในระบบ ("moderate") → ข้อความแบบในไฟล์ HR ("Moderate health risk")
export const HEALTH_RISK_EXPORT = {
  low: "Low health risk",
  moderate: "Moderate health risk",
  high: "High health risk",
  significant: "Significant health risk",
  pending: "Pending",
};
