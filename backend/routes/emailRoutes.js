const express = require('express');
const { sendError } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const emailService = require('../services/emailService');
const reminderService = require('../services/reminderService');
const adminUserEmailService = require('../services/adminUserEmailService');
const morningDigestService = require('../services/morningDigestService');
const { logAudit } = require('../services/auditService');
const { wrapBrandedEmail, escapeHtml } = require('../services/emailLayoutService');
const { normalizeLocale, resolveUserEmailLocale, t } = require('../services/i18nService');

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
    const requestedTo = typeof req.body.to === 'string' ? req.body.to.trim().toLowerCase() : '';
    const adminEmail = req.user.email?.toLowerCase?.() || '';
    if (requestedTo && requestedTo !== adminEmail) {
      return sendError(res, req, 403, 'errors.accessDenied');
    }
    const to = adminEmail;
    const locale = resolveUserEmailLocale(req.user, req.locale);
    const result = await emailService.sendEmail({
      to,
      subject: t('emails.test.subject', locale),
      html: wrapBrandedEmail({
        locale,
        title: t('emails.test.title', locale),
        greeting: t('emails.test.greeting', locale),
        bodyHtml: `<p style="margin:0;">${escapeHtml(t('emails.test.body', locale))}</p>`,
      }),
      text: t('emails.test.text', locale),
    });
    await logAudit({
      userId: req.user.id,
      action: 'EMAIL_TEST',
      newValue: { to, mock: !!result.mock },
      req,
    });
    const message = result.mock
      ? 'SMTP nicht konfiguriert – Test nur simuliert (siehe Backend-Log).'
      : `Test-E-Mail an ${to} gesendet.`;
    res.json({ message, result });
  } catch (error) {
    sendError(res, req, 500, 'errors.testEmailFailed');
  }
});

router.post('/send-reminders', async (req, res) => {
  try {
    const result = await reminderService.sendMissingPredictionReminders({ force: true });
    await logAudit({ userId: req.user.id, action: 'EMAIL_REMINDERS', newValue: result, req });
    res.json(result);
  } catch (error) {
    sendError(res, req, 500, 'errors.remindersSendFailed');
  }
});

router.post('/send-user-reminders', async (req, res) => {
  try {
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
    const result = await adminUserEmailService.sendTipRemindersToUsers(userIds);
    await logAudit({ userId: req.user.id, action: 'EMAIL_USER_REMINDERS', newValue: result, req });
    res.json(result);
  } catch (error) {
    sendError(res, req, 500, 'errors.userRemindersSendFailed');
  }
});

router.post('/send-status-updates', async (req, res) => {
  try {
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
    const result = await adminUserEmailService.sendStatusUpdatesToUsers(userIds);
    await logAudit({ userId: req.user.id, action: 'EMAIL_STATUS_UPDATES', newValue: result, req });
    res.json(result);
  } catch (error) {
    sendError(res, req, 500, 'errors.statusUpdatesSendFailed');
  }
});

router.get('/preview-morning-digest', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : req.user.id;
    const result = await morningDigestService.previewMorningDigest(userId);
    if (result.error) {
      return sendError(res, req, 404, 'errors.userNotFound');
    }
    res.json(result);
  } catch (error) {
    sendError(res, req, 500, 'errors.morningDigestPreviewFailed');
  }
});

router.post('/send-morning-digest', async (req, res) => {
  try {
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
    const result = userIds.length > 0
      ? await morningDigestService.sendMorningDigestsToUsers(userIds, { force: true })
      : await morningDigestService.sendMorningDigests({ force: true });
    await logAudit({ userId: req.user.id, action: 'EMAIL_MORNING_DIGEST', newValue: result, req });
    res.json(result);
  } catch (error) {
    sendError(res, req, 500, 'errors.morningDigestSendFailed');
  }
});

module.exports = router;
