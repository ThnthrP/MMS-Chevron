import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";

// สุ่ม PIN 6 หลัก เช่น "482913"
const generateRandomPin = () =>
  String(Math.floor(100000 + Math.random() * 900000));

// ================= ตั้ง/รีเซ็ต PIN ให้พนักงาน =================
// ถ้าไม่ส่ง pin มา → สุ่มให้อัตโนมัติแล้ว return กลับ (ครั้งเดียวเท่านั้น
// เพราะเราเก็บแค่ hash ไม่เก็บ plain text ไว้ที่ไหนเลย — admin ต้องคัดลอกไปแจ้งพนักงานตอนนี้)
export const setEmployeePin = async (req, res) => {
  const { id: employeeId } = req.params;
  const { pin } = req.body;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.json({ success: false, message: "ไม่พบพนักงาน" });
    }

    const finalPin = pin && pin.trim() ? pin.trim() : generateRandomPin();

    if (!/^\d{6}$/.test(finalPin)) {
      return res.json({
        success: false,
        message: "PIN ต้องเป็นตัวเลข 6 หลักเท่านั้น",
      });
    }

    const pinHash = await bcrypt.hash(finalPin, 10);

    await prisma.employeePin.upsert({
      where: { employeeId },
      update: { pinHash, mustChange: true, failedAttempts: 0, lockedUntil: null },
      create: { employeeId, pinHash },
    });

    return res.json({
      success: true,
      message: "ตั้งค่า PIN สำเร็จ",
      // ส่ง plain PIN กลับครั้งเดียวตอนนี้เท่านั้น — เอาไปแจ้งพนักงานแล้วปิดหน้าทิ้งได้เลย
      pin: finalPin,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ================= ปลดล็อกบัญชีที่ถูกล็อกจากกรอก PIN ผิดเกินกำหนด =================
export const unlockEmployeePin = async (req, res) => {
  const { id: employeeId } = req.params;

  try {
    const pinRecord = await prisma.employeePin.findUnique({
      where: { employeeId },
    });

    if (!pinRecord) {
      return res.json({
        success: false,
        message: "พนักงานนี้ยังไม่มี PIN ให้ปลดล็อก",
      });
    }

    await prisma.employeePin.update({
      where: { employeeId },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    return res.json({ success: true, message: "ปลดล็อกบัญชีสำเร็จ" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ================= เช็คสถานะ PIN (ใช้แสดงในตาราง admin) =================
export const getEmployeePinStatus = async (req, res) => {
  const { id: employeeId } = req.params;

  try {
    const pinRecord = await prisma.employeePin.findUnique({
      where: { employeeId },
      select: {
        failedAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const isLocked = !!(
      pinRecord?.lockedUntil && pinRecord.lockedUntil > new Date()
    );

    return res.json({
      success: true,
      hasPin: !!pinRecord,
      isLocked,
      failedAttempts: pinRecord?.failedAttempts ?? 0,
      lockedUntil: pinRecord?.lockedUntil ?? null,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ================= Bulk generate PIN ให้พนักงานทุกคนที่ยัง active =================
export const bulkSetPins = async (req, res) => {
  const { includeExisting } = req.body; // true = รีเซ็ตคนที่มี PIN อยู่แล้วด้วย

  try {
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      orderBy: { empCode: "asc" },
      include: { pin: true },
    });

    const results = []; // { empCode, empId, fullName, pin }
    const skippedNoEmpId = [];
    const skippedHasPin = [];

    for (const employee of employees) {
      if (!employee.empId) {
        skippedNoEmpId.push({
          empCode: employee.empCode,
          fullName: employee.fullName,
        });
        continue;
      }

      if (employee.pin && !includeExisting) {
        skippedHasPin.push({
          empCode: employee.empCode,
          empId: employee.empId,
          fullName: employee.fullName,
        });
        continue;
      }

      const pin = generateRandomPin();
      const pinHash = await bcrypt.hash(pin, 10);

      await prisma.employeePin.upsert({
        where: { employeeId: employee.id },
        update: { pinHash, mustChange: true, failedAttempts: 0, lockedUntil: null },
        create: { employeeId: employee.id, pinHash },
      });

      results.push({
        empCode: employee.empCode,
        empId: employee.empId,
        fullName: employee.fullName,
        pin,
      });
    }

    return res.json({
      success: true,
      message: `ตั้งค่า PIN สำเร็จ ${results.length} คน`,
      results,
      skippedNoEmpId,
      skippedHasPin,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
