import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import {
  USER_ROLES_INCLUDE,
  roleNamesOf,
  permissionsOf,
} from "../utils/roles.js";

const userAuth = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not Authorized",
    });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

    if (!tokenDecode.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // role หลัก + role เสริม พร้อม permission ของทุก role
    const user = await prisma.user.findUnique({
      where: { id: tokenDecode.userId },
      include: USER_ROLES_INCLUDE,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // ชื่อ role ทั้งหมด (role หลักอยู่ตัวแรก) — เช็กสิทธิ์ด้วย hasRole / hasAnyRole ใน utils/roles.js
    user.roleNames = roleNamesOf(user);

    // inject user
    req.user = user;
    req.userId = user.id;

    // inject permissions (สำคัญ) — รวมจากทุก role
    req.permissions = permissionsOf(user);

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default userAuth;
