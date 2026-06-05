const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const notificationService = require('../services/notificationService');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user.id);
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ notifications, unreadCount });
  } catch (error) {
    sendError(res, req, 500, 'errors.notificationsLoadFailed');
  }
});

router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    if (!notification) return sendError(res, req, 404, 'errors.notificationNotFound');
    res.json(notification);
  } catch (error) {
    sendError(res, req, 500, 'errors.notificationMarkFailed');
  }
});

router.post('/read-all', authMiddleware, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ message: 'Alle Benachrichtigungen gelesen.' });
  } catch (error) {
    sendError(res, req, 500, 'errors.notificationMarkFailed');
  }
});

router.post('/admin/send', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, title, message, type, link } = req.body;
    const { User } = require('../models');

    if (userId) {
      await notificationService.createNotification({ userId, title, message, type, link });
    } else {
      const users = await User.findAll({ where: { role: 'user' } });
      await notificationService.createBulkNotifications(
        users.map((u) => ({ userId: u.id, title, message, type: type || 'info', link }))
      );
    }

    res.json({ message: 'Benachrichtigung(en) gesendet.' });
  } catch (error) {
    sendError(res, req, 500, 'errors.sendFailed');
  }
});

module.exports = router;
