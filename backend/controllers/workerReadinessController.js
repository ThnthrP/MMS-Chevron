import prisma from "../config/prisma.js";
import * as complianceService from "../services/complianceService.js";
import {
  getExpiryBucket,
  getMedicalExpiryBucket,
} from "../utils/expiryStatus.js";

// เกณฑ์เดียวกับ complianceService.js — ใช้ threshold ยาวกว่า (90 วัน)
// สำหรับ Medical Check up เพราะนัดคิวโรงพยาบาลใช้เวลานาน
const MEDICAL_EXAM_CHECK_TYPES = ["Medical Check up"];

function getMedicalCheckBucket(medicalCheck) {
  return MEDICAL_EXAM_CHECK_TYPES.includes(medicalCheck.checkType)
    ? getMedicalExpiryBucket(medicalCheck.expiryDate)
    : getExpiryBucket(medicalCheck.expiryDate);
}

// ================= ของฉัน / ความพร้อมการลงงาน =================
export const getReadiness = async (req, res) => {
  try {
    const employeeId = req.employeeId;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { medicalChecks: true },
    });

    if (!employee) {
      return res.json({ success: false, message: "ไม่พบข้อมูลพนักงาน" });
    }

    // Training gap (mandatory/assigned/others ต่อ client) — reuse ตรงๆ
    // จาก complianceService ไม่คำนวณซ้ำ
    const gap = await complianceService.getWorkerGap(employeeId);

    // EMOB / ผลสุขภาพประจำปี — bucket เดียวกับที่ ComplianceDashboard ใช้
    const medicalChecks = employee.medicalChecks.map((m) => ({
      id: m.id,
      checkType: m.checkType,
      hospital: m.hospital,
      issuedDate: m.issuedDate,
      expiryDate: m.expiryDate,
      status: m.status,
      bucket: getMedicalCheckBucket(m),
      notes: m.notes,
    }));

    // ผลตรวจสุขภาพประจำปีแบบละเอียด — ทุก version (isLatest=false รวมไว้
    // แสดงเป็นประวัติย้อนหลังตาม spec 4.5)
    const examRecords = await prisma.medicalExamRecord.findMany({
      where: { employeeId },
      orderBy: { examDate: "desc" },
    });
    const latestExam =
      examRecords.find((e) => e.isLatest) || examRecords[0] || null;

    // "รายการที่ควรติดตาม" — มาจาก flaggedAbnormal ที่ตั้งไว้ใน
    // MedicalExamRecord (v5.8) เท่านั้น ไม่ derive เพิ่มเติมที่นี่
    const followUpItems = [];
    if (latestExam?.flaggedAbnormal) {
      followUpItems.push({
        note:
          latestExam.recommendation ||
          latestExam.note ||
          "พบผลตรวจผิดปกติ กรุณาติดตาม",
        examDate: latestExam.examDate,
      });
    }

    return res.json({
      success: true,
      medicalChecks,
      gap: gap.clients, // { chevron: { mandatory, assigned, others }, ... }
      latestExam,
      examHistory: examRecords,
      followUpItems,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};