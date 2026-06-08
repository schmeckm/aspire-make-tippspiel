const express = require('express');
const { sendError } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { getAllSettings, getPublicSettings, updateSettings } = require('../services/settingsService');
const { logAudit } = require('../services/auditService');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const settings = isAdmin ? await getAllSettings() : await getPublicSettings();
    res.json(settings);
  } catch (error) {
    sendError(res, req, 500, 'errors.settingsLoadFailed');
  }
});

router.get('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    res.json(await getAllSettings());
  } catch (error) {
    sendError(res, req, 500, 'errors.settingsLoadFailed');
  }
});

module.exports = router;

module.exports.updateSettings = async (req, res) => {
  try {
    const { affectsReminderSchedule } = require('../services/emailReminderSettingsService');
    const settings = await updateSettings(req.body);
    if (affectsReminderSchedule(req.body)) {
      const { restartScheduler } = require('../services/schedulerService');
      await restartScheduler();
    }
    await logAudit({ userId: req.user.id, action: 'SETTINGS_UPDATE', newValue: req.body, req });
    res.json(settings);
  } catch (error) {
    sendError(res, req, 500, 'errors.settingsSaveFailed');
  }
};
