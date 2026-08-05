import * as service from "../services/projectMessageService.js";
import { notifyRole } from "../services/notificationService.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getMessages(req, res) {
  try {
    const { projectId } = req.params;
    const messages = await service.getMessages(projectId);
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function createMessage(req, res) {
  try {
    const { projectId } = req.params;
    const { content } = req.body;
    const files = req.files || [];

    if (!content?.trim() && files.length === 0) {
      return res
        .status(400)
        .json({ message: "ต้องมีข้อความหรือไฟล์แนบอย่างน้อย 1 อย่าง" });
    }

    const message = await service.createMessage(
      projectId,
      req.user.id,
      content,
      files,
    );

    // แจ้งเตือนอีกฝั่ง — ถ้า MP ส่ง แจ้ง PE, ถ้า PE ส่ง แจ้ง MP
    const senderRole = req.user.role?.name;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    const notifyTargetRole = senderRole === "pe" ? "manpower" : "pe";
    notifyRole(notifyTargetRole, {
      type: "project_discussion",
      title: `ข้อความใหม่ใน ${project?.name || "โปรเจกต์"}`,
      message: content?.trim()
        ? content.slice(0, 100)
        : `แนบไฟล์ ${files.length} ไฟล์`,
      link: `/projects/${projectId}?tab=discussion`,
    }).catch((err) => console.error("notifyRole failed:", err));

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
