import * as service from "../services/supervisorService.js";

export async function getProjectsOverview(req, res) {
  try {
    const data = await service.getProjectsOverview();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

// Manpower Calendar — รายละเอียด requirement เดียว (timeline ขั้นตอน + ตารางวันทำงาน)
export async function getProjectOverview(req, res) {
  try {
    const data = await service.getProjectOverview(req.params.id);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

// Manpower Calendar — ประวัติของ requirement (จาก Audit Log)
export async function getProjectHistory(req, res) {
  try {
    const data = await service.getProjectHistory(req.params.id);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
}
