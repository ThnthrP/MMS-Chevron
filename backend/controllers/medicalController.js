import prisma from "../config/prisma.js";

export const createMedicalCheck = async (req, res) => {
  try {
    const { employeeId, status } = req.body;

    const check = await prisma.medicalCheck.create({
      data: {
        employeeId,
        status,
      },
    });

    res.json({ success: true, data: check });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};