import * as service from "../services/notificationService.js";

export async function getMine(req, res) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      service.getMyNotifications(req.user.id),
      service.getUnreadCount(req.user.id),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function markRead(req, res) {
  try {
    await service.markAsRead(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function markAllRead(req, res) {
  try {
    await service.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
