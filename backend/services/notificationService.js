import { PrismaClient } from "@prisma/client";
import { userHasRoleWhere } from "../utils/roles.js";
const prisma = new PrismaClient();

// ส่ง notification ให้ทุก user ที่มี role ใด role หนึ่งใน roleNames (role หลักหรือ role เสริม)
// user ที่มีหลาย role ได้แจ้งเตือนครั้งเดียว — excludeUserIds ใช้กันแจ้งตัวเอง
export async function notifyRoles(
  roleNames,
  { type, title, message, link },
  { excludeUserIds = [] } = {},
) {
  const names = [...new Set([].concat(roleNames || []).filter(Boolean))];
  if (names.length === 0) return { count: 0 };

  const users = await prisma.user.findMany({
    where: {
      OR: names.map((n) => userHasRoleWhere(n)),
      ...(excludeUserIds.length ? { id: { notIn: excludeUserIds } } : {}),
    },
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

// ส่ง notification ให้ทุก user ที่มี role ตรงกับ roleName ที่ระบุ (role หลักหรือ role เสริม)
export async function notifyRole(roleName, payload, options) {
  return notifyRoles([roleName], payload, options);
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
