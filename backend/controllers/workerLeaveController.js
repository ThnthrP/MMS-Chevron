import prisma from "../config/prisma.js";
import { notifyRole } from "../services/notificationService.js"; // ← เพิ่ม

// ── กลุ่ม role ที่ต้องได้รับแจ้งเตือนเรื่องใบลาพนักงาน ──
// อ้างอิงจาก "กำหนดสิทธิ์การเข้าถึง - Approval (R1) (2) - MMS - HR.pdf"
// (แก้ตรงนี้ที่เดียวถ้าในอนาคตมี role HR เพิ่ม/ลด — เหมือน pattern ใน complianceController.js)
const LEAVE_REQUEST_NOTIFY_ROLES = [
  "hr_supervisor",
  "personal_record_officer",
  "hr_officer",
  "training_officer",
];

const LEAVE_TYPE_LABEL = {
  sick: "ลาป่วย",
  personal: "ลากิจ",
  vacation: "ลาพักร้อน",
  other: "อื่นๆ",
};

// ================= ยื่นใบลา =================
export const createLeaveRequest = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!leaveType || !startDate || !endDate) {
    return res.json({
      success: false,
      message: "กรุณากรอกประเภทการลา วันเริ่ม และวันสิ้นสุด",
    });
  }

  const validLeaveTypes = ["sick", "personal", "vacation", "other"];
  if (!validLeaveTypes.includes(leaveType)) {
    return res.json({ success: false, message: "ประเภทการลาไม่ถูกต้อง" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.json({ success: false, message: "รูปแบบวันที่ไม่ถูกต้อง" });
  }

  if (end < start) {
    return res.json({
      success: false,
      message: "วันสิ้นสุดต้องไม่มาก่อนวันเริ่ม",
    });
  }

  // ── ไฟล์แนบ (ถ้ามี) — multer แปะไว้ที่ req.file ก่อนถึง handler นี้ ──
  const attachmentUrl = req.file
    ? `/uploads/leave-attachments/${req.file.filename}`
    : null;
  const attachmentFileName = req.file
    ? Buffer.from(req.file.originalname, "latin1").toString("utf8")
    : null;

  try {
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: req.employeeId,
        leaveType,
        startDate: start,
        endDate: end,
        reason: reason || null,
        attachmentUrl,
        attachmentFileName,
      },
      include: {
        employee: { select: { fullName: true, empCode: true } },
      },
    });

    // ── แจ้งเตือนทุก role HR ที่เกี่ยวข้อง — ไม่บล็อก response ถ้า
    // notify fail (เหมือน pattern requestTraining ใน complianceController.js) ──
    const payload = {
      type: "leave_request",
      title: "พนักงานยื่นใบลาใหม่",
      message: `${leaveRequest.employee.fullName} (${leaveRequest.employee.empCode}) — ${LEAVE_TYPE_LABEL[leaveType]} ${start.toLocaleDateString("th-TH")} ถึง ${end.toLocaleDateString("th-TH")}`,
      link: `/leave-requests/${leaveRequest.id}`,
    };

    Promise.all(
      LEAVE_REQUEST_NOTIFY_ROLES.map((role) =>
        notifyRole(role, payload).catch((err) =>
          console.error(`notifyRole (${role}) failed:`, err),
        ),
      ),
    );

    return res.json({
      success: true,
      message: "ยื่นใบลาสำเร็จ รอการอนุมัติ",
      leaveRequest,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ================= ดูใบลาของตัวเอง (ทุกสถานะ) =================
export const getMyLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { employeeId: req.employeeId },
      include: {
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, leaveRequests });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ================= ยกเลิกใบลา (เฉพาะที่ status = pending เท่านั้น) =================
export const cancelLeaveRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest || leaveRequest.employeeId !== req.employeeId) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบใบลานี้ หรือไม่มีสิทธิ์เข้าถึง",
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.json({
        success: false,
        message: "ยกเลิกได้เฉพาะใบลาที่ยังรออนุมัติเท่านั้น",
      });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return res.json({
      success: true,
      message: "ยกเลิกใบลาเรียบร้อย",
      leaveRequest: updated,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
