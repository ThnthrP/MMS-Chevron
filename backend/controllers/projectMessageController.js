import * as service from "../services/projectMessageService.js";
import { notifyRole } from "../services/notificationService.js";
// ใช้ prisma client ตัวกลางของระบบ (เดิม new PrismaClient() ในไฟล์นี้ = เปิด connection pool เพิ่มอีกชุด)
import prisma from "../config/prisma.js";

// แจ้งเตือนอีกฝั่งของ Discussion — role ปัจจุบัน (ชื่อเก่า pe / manpower ถูกลบออกจากระบบแล้ว)
//   PE ส่ง      → แจ้ง Manpower
//   Manpower ส่ง → แจ้ง PE
//   admin ส่ง   → แจ้งทั้งสองฝั่ง
const NOTIFY_TARGETS = {
  project_engineer: ["manpower_supply"],
  manpower_supply: ["project_engineer"],
  admin: ["project_engineer", "manpower_supply"],
};

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

    // ดึง role ของผู้ส่งจาก DB — req.user จาก userAuth อาจมีแค่ id
    const [sender, project] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: { select: { name: true } } },
      }),
      prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      }),
    ]);

    const targets = NOTIFY_TARGETS[sender?.role?.name] || [];
    const payload = {
      type: "project_discussion",
      title: `ข้อความใหม่ใน ${project?.name || "โปรเจกต์"}`,
      message: content?.trim()
        ? content.slice(0, 100)
        : `แนบไฟล์ ${files.length} ไฟล์`,
      link: `/projects/${projectId}?tab=discussion`,
    };
    for (const role of targets) {
      notifyRole(role, payload).catch((err) =>
        console.error(`notifyRole(${role}) failed:`, err),
      );
    }

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
