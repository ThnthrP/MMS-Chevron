// ============================================================
// scripts/chevron/lib/peTrackingColumns.js
//
// Single source of truth for the 41 PE-tracking columns (A..AO),
// their 3-line (TH / EN / ZH) header text, and how each column's
// value is derived when exporting back OUT of the database.
//
// Used by:
//   - scripts/chevron/exportMedicalExamRecordsToPETracking.js (CLI)
//   - controllers/analyticsController.js (download-from-browser)
//
// ── RESOLVED (previously gaps, now wired) ──
//   col E  (สถานที่ทำงานในพื้นที่เชฟรอน / Chevron Workplace)
//     → Now stored in Employee.workplace (added via
//       prisma/PATCH-schema-add-workplace.prisma — run the migration first).
//       Captured by addMissingEmployeesFromPETracking.js at employee-creation
//       time. NOTE: only set once, at creation — if an employee's workplace
//       changes in a later year's PE tracking file, this script does not
//       currently update it (importMedicalExamRecords.js doesn't touch it
//       either). Ask if you want re-imports to sync col E going forward.
//   col AL/AM/AN/AO (follow-up date / days-to-update / expiry status / days-to-expiry)
//     → Computed at export time in buildPeTrackingWorkbook.js using the real
//       formulas confirmed from the live Excel file:
//         AN/AO from col K (examDate) — matches utils/expiryStatus.js's
//         getMedicalExpiryBucket() (criticalDays=30, warningDays=90).
//         AL/AM from col AK (commentDate) with a 90-day interval — NOTE this
//         is the interval taken from the actual Excel formula
//         `(AK2+90)-TODAY()`; the docstring/default in
//         utils/expiryStatus.js's getFollowUpStatus() says 180 days, which is
//         stale relative to the real spreadsheet. We pass 90 explicitly to
//         match reality — worth fixing the util's default/docstring too.
//   col D (บริษัท / Company)
//     → No Company model since schema v5.5 (single-company system).
//       Hardcoded to COMPANY_NAME below — change if this is ever not true.
//   col B/C (ชื่อ / นามสกุล ภาษาอังกฤษ)
//     → DB only stores combined Employee.fullNameEN ("First Last"). Split is
//       best-effort: first word = first name, remainder = surname. If a
//       surname legitimately has a space in it, this will mis-split — the
//       only fix is to store first/last EN separately going forward.
// ============================================================

export const COMPANY_NAME = "Experteam Co.Ltd.";

// [excelColumnLetter, header lines (joined with \n for the wrapped cell)]
export const PE_TRACKING_COLUMNS = [
  ["A", "ชื่อ\nFirst Name and Middle Name\n名字"],
  ["B", "ชื่อ\nFirst Name and Middle Name\n名字"],
  ["C", "นามสกุลเต็ม\nFull Surname\n全姓"],
  ["D", "บริษัท\nCompany\n公司"],
  ["E", "สถานที่ทำงานในพื้นที่เชฟรอน\nChevron Workplace\n雪佛龙工作场所"],
  ["F", "ตำแหน่ง"],
  ["G", "แผนก"],
  ["H", "วัน เดือน ปี เกิด\nDate of Birth (MM/DD/YYYY)\n出生日期"],
  ["I", "อายุ (ปี)\nAge (year)\n年龄 (年)"],
  ["J", "โรคประจำตัว\nUnderlying disease\n基础疾病"],
  [
    "K",
    "วันที่ตรวจร่างกาย\nDate of physical examination (MM/DD/YYYY)\n体检日期",
  ],
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
  ["X", "เอ็นไซม์ตับ\nSGPT (ALT)\n血清丙氨酸氨基转移酶"],
  ["Y", "กรดยูริค\nUric acid\n血清尿酸"],
  ["Z", "คลื่นไฟฟ้าหัวใจ\nElectrocardiogram (EKG, ECG)\n心电图"],
  ["AA", "รายละเอียดความผิดปกติของคลื่นไฟฟ้าหัวใจ"],
  ["AB", "เอ็กซ์เรย์ปอด\nChest x-ray\n胸部X光片"],
  ["AC", "รายละเอียดความผิดปกติของเอ็กซเรย์ปอด"],
  ["AD", "ผลตรวจฟัน\nDental examination result\nผลตรวจฟัน\n牙科检查结果"],
  ["AE", "รายละเอียดความผิดปกติของผลตรวจฟัน"],
  ["AF", "EST (อายุ55ปี)"],
  ["AG", "รายละเอียดความผิดปกติของ EST"],
  ["AH", "หมายเหตุ\nNote\n注释"],
  ["AI", "Health Risk"],
  ["AJ", "Recommendation"],
  ["AK", "วันที่ลง Comment"],
  ["AL", "วันที่ต้องติดตาม"],
  ["AM", "ระยะเวลาที่ต้องอัพเดท (วัน)"],
  ["AN", "สถานะวันหมดอายุ"],
  ["AO", "ระยะเวลาที่จะหมดอายุ (วัน)"],
];

export const DATE_FMT = "dd-mmm-yyyy";
