import prisma from "../config/prisma.js";

export const createRequest = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      projectId,
      servicePosition,
      quantity,
      startDate,
      endDate,
      isOffshore,
    } = req.body;

    // basic validation
    if (!projectId || !servicePosition || !quantity) {
      return res.json({
        success: false,
        message: "Missing required fields",
      });
    }

    const request = await prisma.manpowerRequest.create({
      data: {
        projectId,
        servicePosition,
        quantity,

        // new fields
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isOffshore: isOffshore || false,

        // workflow
        status: "draft",

        requestedById: userId,
      },
    });

    res.json({
      success: true,
      request,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { employeeId, requestId } = req.body;

    // =========================
    // 1. check request
    // =========================
    const request = await prisma.manpowerRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.json({
        success: false,
        message: "Request not found",
      });
    }

    // ต้อง approved ก่อน
    if (request.status !== "approved") {
      return res.json({
        success: false,
        message: "Request not ready for booking",
      });
    }

    // =========================
    // 2. check duplicate booking
    // =========================
    const existingBooking = await prisma.booking.findFirst({
      where: {
        employeeId,
        requestId,
      },
    });

    if (existingBooking) {
      return res.json({
        success: false,
        message: "Already booked",
      });
    }

    // =========================
    // 3. check safety
    // =========================
    const safety = await prisma.safetyCheck.findFirst({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    if (!safety || safety.status !== "passed") {
      return res.json({
        success: false,
        message: "Safety not passed",
      });
    }

    // =========================
    // 4. check medical
    // =========================
    const medical = await prisma.medicalCheck.findFirst({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    if (!medical || medical.status !== "passed") {
      return res.json({
        success: false,
        message: "Medical not passed",
      });
    }

    // =========================
    // 5. create booking
    // =========================
    const booking = await prisma.booking.create({
      data: {
        employeeId,
        requestId,
        status: "pending",
      },
    });

    // =========================
    // 6. update request status
    // =========================
    await prisma.manpowerRequest.update({
      where: { id: requestId },
      data: {
        status: "booked",
      },
    });

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
