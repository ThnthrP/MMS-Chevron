import * as service from "../services/trainingRequestService.js";
import { notifyRole } from "../services/notificationService.js";

// ── กลุ่ม role ที่ต้องได้รับแจ้งเตือนเรื่อง training request (ให้ตรงกับ complianceController.js เดิม) ──
const TRAINING_REQUEST_NOTIFY_ROLES = [
  "hr_officer",
  "hr_supervisor",
  "training_officer",
];

export async function createBatch(req, res) {
  try {
    const { items } = req.body;
    if (!items?.length) {
      return res.status(400).json({ message: "items are required" });
    }
    const { batch, employeeCount, trainingCount } = await service.createBatch(
      req.user.id,
      items,
    );

    const payload = {
      type: "training_request_batch",
      title: "MP ขอให้จัด Training (หลายรายการ)",
      message: `${employeeCount} คน • ${trainingCount} training`,
      link: `/training-requests/${batch.id}`,
    };

    Promise.all(
      TRAINING_REQUEST_NOTIFY_ROLES.map((role) =>
        notifyRole(role, payload).catch((err) =>
          console.error(`notifyRole (${role}) failed:`, err),
        ),
      ),
    );

    res.status(201).json({ id: batch.id, employeeCount, trainingCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// ...ส่วนอื่นเหมือนเดิมทุกอย่าง...

export async function getBatch(req, res) {
  try {
    const data = await service.getBatch(req.params.id);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getAllBatches(req, res) {
  try {
    const data = await service.getAllBatches();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }
    const batch = await service.updateStatus(req.params.id, status);
    res.json(batch);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}
