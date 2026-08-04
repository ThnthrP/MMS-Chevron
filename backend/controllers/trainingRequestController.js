import * as service from "../services/trainingRequestService.js";
import { notifyRole } from "../services/notificationService.js";

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

    notifyRole("hr", {
      type: "training_request_batch",
      title: "MP ขอให้จัด Training (หลายรายการ)",
      message: `${employeeCount} คน • ${trainingCount} training`,
      link: `/training-requests/${batch.id}`,
    }).catch((err) => console.error("notifyRole failed:", err));

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
