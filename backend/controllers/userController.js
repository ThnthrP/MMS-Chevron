import prisma from "../config/prisma.js";

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
