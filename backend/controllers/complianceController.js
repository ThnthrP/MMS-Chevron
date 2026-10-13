import * as service from "../services/complianceService.js";
import { notifyRole } from "../services/notificationService.js";

export async function getComplianceDashboard(req, res) {
  try {
    const data = await service.getComplianceDashboard();

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
}

export async function getWorkerGap(req, res) {
  try {
    const data = await service.getWorkerGap(req.params.id);

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
}

export async function getComplianceStats(req, res) {
  try {
    const stats = await service.getComplianceStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function getWorkerAlerts(req, res) {
  try {
    const data = await service.getWorkerAlerts(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getCertificationDetail(req, res) {
  try {
    const data = await service.getCertificationDetail(req.params.id);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

// ── กลุ่ม role ที่ต้องได้รับแจ้งเตือนเรื่อง training request ──
// (แก้ตรงนี้ที่เดียวถ้าในอนาคตมี role HR เพิ่ม/ลด)
const TRAINING_REQUEST_NOTIFY_ROLES = [
  "hr_officer",
  "hr_supervisor",
  "training_officer",
];

export async function requestTraining(req, res) {
  try {
    const { trainingId, employeeIds } = req.body;
    if (!trainingId || !employeeIds?.length) {
      return res
        .status(400)
        .json({ message: "trainingId and employeeIds are required" });
    }

    const result = await service.requestTraining(trainingId, employeeIds);

    // ── แจ้งเตือนทุก role ที่เกี่ยวข้องกับ HR ──
    const payload = {
      type: "training_request",
      title: "MP ขอให้จัด Training",
      message: `${result.trainingName} — ${result.employeeCount} คน (${result.employeeNames.slice(0, 3).join(", ")}${result.employeeCount > 3 ? " และอื่นๆ" : ""})`,
      link: `/certifications?trainingId=${trainingId}&empIds=${employeeIds.join(",")}`,
    };

    Promise.all(
      TRAINING_REQUEST_NOTIFY_ROLES.map((role) =>
        notifyRole(role, payload).catch((err) =>
          console.error(`notifyRole (${role}) failed:`, err),
        ),
      ),
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// export async function requestTraining(req, res) {
//   try {
//     const { trainingId, employeeIds } = req.body;
//     if (!trainingId || !employeeIds?.length) {
//       return res
//         .status(400)
//         .json({ message: "trainingId and employeeIds are required" });
//     }

//     const result = await service.requestTraining(trainingId, employeeIds);

//     // ── แจ้งเตือน HR ทุกคน ──
//     notifyRole("hr", {
//       type: "training_request",
//       title: "MP ขอให้จัด Training",
//       message: `${result.trainingName} — ${result.employeeCount} คน (${result.employeeNames.slice(0, 3).join(", ")}${result.employeeCount > 3 ? " และอื่นๆ" : ""})`,
//       link: `/certifications?trainingId=${trainingId}&empIds=${employeeIds.join(",")}`,
//     }).catch((err) =>
//       console.error("notifyRole (training_request) failed:", err),
//     );

//     res.json({ success: true, ...result });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// }
