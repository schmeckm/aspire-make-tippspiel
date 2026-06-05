const { Notification } = require('../models');
const socketService = require('./socketService');

async function createNotification({ userId, title, message, type = 'info', link = null }) {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type,
    link,
    isRead: false,
  });

  socketService.emitToUser(userId, 'notification', notification);
  return notification;
}

async function createBulkNotifications(notifications) {
  const created = await Notification.bulkCreate(notifications);
  for (const n of created) {
    socketService.emitToUser(n.userId, 'notification', n);
  }
  return created;
}

async function getUserNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  const where = { userId };
  if (unreadOnly) where.isRead = false;

  return Notification.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
  });
}

async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });
  if (!notification) return null;
  await notification.update({ isRead: true });
  return notification;
}

async function markAllAsRead(userId) {
  await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
}

async function getUnreadCount(userId) {
  return Notification.count({ where: { userId, isRead: false } });
}

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
