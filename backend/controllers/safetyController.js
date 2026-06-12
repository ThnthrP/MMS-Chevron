import prisma from "../config/prisma.js";

export const createSafetyCheck = async (req, res) => {
  try {
    const { employeeId, status } = req.body;

    const check = await prisma.safetyCheck.create({
      data: {
        employeeId,
        status, // pending / passed / failed
      },
    });

    res.json({ success: true, data: check });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};