import prisma from "../config/prisma.js";
// บนสุดของไฟล์ เพิ่ม:
import bcrypt from "bcryptjs";   // ⚠ ใช้ตัวเดียวกับที่ authController ใช้ตอน login (ดูหมายเหตุ)

// =====================================================
// GET CURRENT USER
// =====================================================

export const getUserData = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

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

        employee: true,
      },
    });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,

      userData: {
        id: user.id,

        name: user.name,
        email: user.email,

        role: {
          id: user.role?.id,
          name: user.role?.name,
        },

        employee: user.employee,

        permissions:
          user.role?.permissions?.map(
            (p) => `${p.permission.resource}:${p.permission.action}`,
          ) || [],
      },
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// UPDATE PROFILE
// =====================================================

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { name } = req.body;

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        name,
      },
    });

    return res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// UPDATE USER ROLE
// =====================================================

export const updateUserRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    if (req.user.id === userId) {
      return res.json({
        success: false,
        message: "Cannot change your own role",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        roleId,
      },
    });

    return res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET ALL ROLES
// =====================================================

export const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return res.json({
      success: true,
      roles,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET ALL USERS
// =====================================================

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        employee: true,
      },

      orderBy: {
        name: "asc",
      },
    });

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// CREATE USER
// =====================================================
export const createUser = async (req, res) => {
  try {
    const { name, email, password, roleId, employeeId } = req.body;
    if (!name || !email || !password || !roleId) {
      return res.json({ success: false, message: "name, email, password, roleId are required" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.json({ success: false, message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, roleId, employeeId: employeeId || null },
      include: { role: true, employee: true },
    });
    return res.json({ success: true, user });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// =====================================================
// DELETE USER
// =====================================================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res.json({ success: false, message: "Cannot delete your own account" });
    }
    await prisma.user.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// =====================================================
// LINK / UNLINK EMPLOYEE (employeeId = null เพื่อ unlink)
// =====================================================
export const updateUserEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: { employeeId: employeeId || null },
      include: { role: true, employee: true },
    });
    return res.json({ success: true, user });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// =====================================================
// AVAILABLE EMPLOYEES (ยังไม่ผูกกับ user คนไหน)
// =====================================================
export const getAvailableEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { user: null },        // User.employeeId @unique → back-relation
      select: { id: true, empCode: true, fullName: true },
      orderBy: { fullName: "asc" },
    });
    return res.json({ success: true, employees });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
