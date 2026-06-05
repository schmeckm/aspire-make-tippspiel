const express = require('express');
const { sendError } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const emailService = require('../services/emailService');
const reminderService = require('../services/reminderService');
const { logAudit } = require('../services/auditService');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/status', async (req, res) => {
  try {
    const status = await emailService.getEmailStatus();
    res.json(status);
  } catch (error) {
    sendError(res, req, 500, 'errors.emailStatusLoadFailed');
  }
});

router.post('/send-test', async (req, res) => {
  try {
    const to = req.body.to || req.user.email;
    const result = await emailService.sendEmail({
      to,
      subject: 'WM 2026 Tippspiel – Test-E-Mail',
      html: '<h2>Test erfolgreich!</h2><p>Die E-Mail-Konfiguration funktioniert.</p>',
      text: 'Test erfolgreich! Die E-Mail-Konfiguration funktioniert.',
    });
    await logAudit({ userId: req.user.id, action: 'EMAIL_TEST', req });
    res.json({ message: 'Test-E-Mail gesendet.', result });
  } catch (error) {
    sendError(res, req, 500, 'errors.testEmailFailed');
  }
});

router.post('/send-reminders', async (req, res) => {
  try {
    const result = await reminderService.sendMissingPredictionReminders();
    await logAudit({ userId: req.user.id, action: 'EMAIL_REMINDERS', newValue: result, req });
    res.json(result);
  } catch (error) {
    sendError(res, req, 500, 'errors.remindersSendFailed');
  }
});

module.exports = router;
