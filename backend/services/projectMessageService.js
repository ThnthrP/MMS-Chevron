import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getMessages(projectId) {
  const messages = await prisma.projectMessage.findMany({
    where: { projectId },
    include: {
      sender: {
        select: { id: true, name: true, role: { select: { name: true } } },
      },
      attachments: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return messages;
}

export async function createMessage(projectId, senderId, content, files) {
  const attachmentsData = (files || []).map((f) => ({
    fileName: f.originalname,
    filePath: `/uploads/project-messages/${f.filename}`,
    fileType: f.originalname.split(".").pop()?.toLowerCase() || null,
  }));

  const message = await prisma.projectMessage.create({
    data: {
      projectId,
      senderId,
      content: content || null,
      attachments: { create: attachmentsData },
    },
    include: {
      sender: {
        select: { id: true, name: true, role: { select: { name: true } } },
      },
      attachments: true,
    },
  });

  return message;
}
