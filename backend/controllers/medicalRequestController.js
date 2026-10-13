import * as service from "../services/medicalRequestService.js";
import { notifyRole } from "../services/notificationService.js";

export async function createBatch(req, res) {
  try {
    const { items } = req.body;
    if (!items?.length) {
      return res.status(400).json({ message: "items are required" });
    }
    const { batch, employeeCount } = await service.createBatch(
      req.user.id,
      items,
    );

    notifyRole("hr_officer", {
      type: "medical_request_batch",
      title: "MP ขอให้จัด Medical Check-up (หลายรายการ)",
      message: `${employeeCount} คน`,
      link: `/medical-requests/${batch.id}`,
    }).catch((err) => console.error("notifyRole failed:", err));

    res.status(201).json({ id: batch.id, employeeCount });
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
