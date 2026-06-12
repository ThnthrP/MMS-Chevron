import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

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

    const user = await prisma.user.findUnique({
      where: { id: tokenDecode.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // inject user
    req.user = user;
    req.userId = user.id;

    // inject permissions (สำคัญ)
    req.permissions = user.role.permissions.map(
      (p) => `${p.permission.resource}:${p.permission.action}`,
    );

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default userAuth;
