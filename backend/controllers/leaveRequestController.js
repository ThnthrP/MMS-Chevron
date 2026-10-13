import prisma from "../config/prisma.js";

// ================= List ใบลาทั้งหมด (filter ด้วย status ได้) =================
export const getLeaveRequests = async (req, res) => {
  const { status, employeeId } = req.query;

  try {
    const where = {};
    if (status) where.status = status; // pending / approved / rejected
    if (employeeId) where.employeeId = employeeId;

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            empCode: true,
            empId: true,
            fullName: true,
            position: { select: { name: true } },
          },
        },
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, leaveRequests });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ================= ดูใบลา 1 รายการ (รายละเอียดเต็ม) =================
export const getLeaveRequestDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            empCode: true,
            empId: true,
            fullName: true,
            phone: true,
            position: { select: { name: true } },
          },
        },
        approver: { select: { name: true } },
      },
    });

    if (!leaveRequest) {
      return res.json({ success: false, message: "ไม่พบใบลานี้" });
    }

    return res.json({ success: true, leaveRequest });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ================= อนุมัติใบลา =================
export const approveLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const { approverNote } = req.body;

  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      return res.json({ success: false, message: "ไม่พบใบลานี้" });
    }

    if (leaveRequest.status !== "pending") {
      return res.json({
        success: false,
        message: "ใบลานี้ถูกดำเนินการไปแล้ว",
      });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "approved",
        approverId: req.userId, // มาจาก userAuth middleware (admin session)
        approverNote: approverNote || null,
      },
    });

    return res.json({
      success: true,
      message: "อนุมัติใบลาสำเร็จ",
      leaveRequest: updated,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ================= ปฏิเสธใบลา (บังคับมีเหตุผล) =================
export const rejectLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const { approverNote } = req.body;

  if (!approverNote || !approverNote.trim()) {
    return res.json({
      success: false,
      message: "กรุณาระบุเหตุผลในการปฏิเสธ",
    });
  }

  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      return res.json({ success: false, message: "ไม่พบใบลานี้" });
    }

    if (leaveRequest.status !== "pending") {
      return res.json({
        success: false,
        message: "ใบลานี้ถูกดำเนินการไปแล้ว",
      });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "rejected",
        approverId: req.userId,
        approverNote,
      },
    });

    return res.json({
      success: true,
      message: "ปฏิเสธใบลาเรียบร้อย",
      leaveRequest: updated,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
