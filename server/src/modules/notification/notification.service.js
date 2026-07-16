import Notification from "./notification.model.js";

/**
 * Creates a notification and optionally emits it via socket.
 * io is optional — pass it from controllers/services that have access.
 */
export const createNotification = async (
  userId,
  type,
  title,
  message,
  metadata = {},
  io = null,
) => {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    metadata,
  });

  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }

  return notification;
};

export const getNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ userId, isRead: false }),
  ]);
  return { notifications, unreadCount };
};

export const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true },
  );
};

export const markAllAsRead = async (userId) => {
  return Notification.updateMany({ userId, isRead: false }, { isRead: true });
};
