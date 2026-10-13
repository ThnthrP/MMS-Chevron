import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

// แยก cookie name ("workerToken") จาก admin ("token") โดยเจตนา —
// กัน session admin/worker ทับกันถ้าเปิดใช้บนเบราว์เซอร์เดียวกันตอนเทส
const workerAuth = async (req, res, next) => {
  const token = req.cookies?.workerToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not Authorized",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "worker" || !decoded.employeeId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: decoded.employeeId },
    });

    if (!employee || employee.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Employee not found or inactive",
      });
    }

    // inject — ทุก endpoint ฝั่ง worker ต้อง filter ด้วย req.employeeId เท่านั้น
    req.employee = employee;
    req.employeeId = employee.id;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default workerAuth;
