import * as service from "../services/trainingRequestService.js";
import { notifyRole } from "../services/notificationService.js";

// ── กลุ่ม role ที่ต้องได้รับแจ้งเตือนเรื่อง training request (ให้ตรงกับ complianceController.js เดิม) ──
const TRAINING_REQUEST_NOTIFY_ROLES = [
  "hr_officer",
  "hr_supervisor",
  "training_officer",
];

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : null;

// POST /api/training-requests
// body: { items: [{ employeeId, globalTrainingId, clientName }], requestedStart?, requestedEnd?, provider?, remarks? }
export async function createBatch(req, res) {
  try {
    const { items, requestedStart, requestedEnd, provider, remarks } = req.body;
    if (!items?.length) {
      return res.status(400).json({ message: "items are required" });
    }
    const { batch, employeeCount, trainingCount } = await service.createBatch(
      req.user.id,
      items,
      { requestedStart, requestedEnd, provider, remarks },
    );

    const when = [fmtDay(batch.requestedStart), fmtDay(batch.requestedEnd)]
      .filter(Boolean)
      .join("–");
    const payload = {
      type: "training_request_batch",
      title: "มีคำขอจัด Training ใหม่",
      message: [
        `${employeeCount} คน • ${trainingCount} training`,
        when,
        batch.provider,
      ]
        .filter(Boolean)
        .join(" • "),
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

// PATCH /api/training-requests/:id/items — HR ยืนยัน / ปฏิเสธ รายคน
export async function decideItems(req, res) {
  try {
    const data = await service.decideItems(req.params.id, req.body, req.user);
    res.json(data);
  } catch (error) {
    if (!error.status) console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

// GET /api/training-requests/availability?start=&end=&globalTrainingId=&employeeIds=a,b
export async function getAvailability(req, res) {
  try {
    const { start, end, globalTrainingId, employeeIds } = req.query;
    const data = await service.getAvailability({
      start,
      end,
      globalTrainingId,
      employeeIds: employeeIds ? String(employeeIds).split(",") : undefined,
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
