import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ส่ง notification ให้ทุก user ที่มี role ตรงกับ roleName ที่ระบุ
export async function notifyRole(roleName, { type, title, message, link }) {
  const users = await prisma.user.findMany({
    where: { role: { name: roleName } },
    select: { id: true },
  });

  if (users.length === 0) return { count: 0 };

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type,
      title,
      message: message || null,
      link: link || null,
    })),
  });

  return { count: users.length };
}

export async function getMyNotifications(userId, { limit = 20 } = {}) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(userId, notificationId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId }, // กัน user คนอื่น mark ของคนอื่น
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
