const { Op } = require('sequelize');
const { User, Match, Prediction, BonusQuestion, BonusPrediction } = require('../models');
const emailService = require('./emailService');
const reminderEmailService = require('./reminderEmailService');
const notificationService = require('./notificationService');
const { getSetting } = require('./settingsService');
const { isEmailRemindersEnabled } = require('./emailReminderSettingsService');
const { getLeaderboard } = require('./leaderboardService');
const { runWithConcurrency } = require('./emailQueueService');
const { toRecipientAuditEntry } = require('./adminUserEmailService');

function groupPredictionsByUser(predictions) {
  const map = new Map();
  for (const prediction of predictions) {
    if (!map.has(prediction.userId)) map.set(prediction.userId, new Set());
    map.get(prediction.userId).add(prediction.matchId);
  }
  return map;
}

async function getReminderRecipients() {
  const requireVerification = await getSetting('requireEmailVerification', true);
  if (requireVerification) {
    return User.findAll({
      where: {
        [Op.or]: [
          { role: 'admin' },
          { role: 'user', emailVerified: true },
        ],
      },
    });
  }
  return User.findAll({ where: { role: { [Op.in]: ['user', 'admin'] } } });
}

async function sendMissingPredictionReminders({ force = false } = {}) {
  const enabled = force || await isEmailRemindersEnabled();
  if (!enabled) {
    return { skipped: true, message: 'E-Mail-Erinnerungen deaktiviert. Bitte aktivieren und speichern, oder manuell erneut senden.' };
  }

  const users = await getReminderRecipients();
  const openMatches = await Match.findAll({
    where: {
      status: 'scheduled',
      kickoffTime: { [Op.gt]: new Date() },
      isManuallyLocked: false,
    },
  });

  if (users.length === 0) {
    return { sent: 0, skipped: 0, recipients: [], message: 'Keine Empfänger gefunden (registrierte Spieler mit bestätigter E-Mail).' };
  }

  const openMatchIds = openMatches.map((m) => m.id);
  const predictionsByUser = openMatchIds.length > 0
    ? groupPredictionsByUser(await Prediction.findAll({
      where: { matchId: { [Op.in]: openMatchIds } },
      attributes: ['userId', 'matchId'],
    }))
    : new Map();

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const upcoming = openMatches.filter((m) => new Date(m.kickoffTime) <= in48h);

  const recipients = users.filter((user) => {
    const predictedIds = predictionsByUser.get(user.id) || new Set();
    return openMatches.some((m) => !predictedIds.has(m.id));
  });

  if (recipients.length === 0) {
    return { sent: 0, skipped: 0, recipients: [], message: 'Keine Erinnerungen nötig – alle Spieler haben ihre offenen Tipps abgegeben.' };
  }

  const recipientLog = [];

  await runWithConcurrency(recipients, async (user) => {
    if (!user.email) {
      recipientLog.push(toRecipientAuditEntry(user, 'skipped', 'no_email'));
      return;
    }

    const predictedIds = predictionsByUser.get(user.id) || new Set();
    const missing = openMatches.filter((m) => !predictedIds.has(m.id));

    await reminderEmailService.sendMissingPredictionsEmail(
      user,
      missing.length,
      upcoming.slice(0, 5),
    );

    const notification = reminderEmailService.buildMissingPredictionsNotification(user, missing.length);

    await notificationService.createNotification({
      userId: user.id,
      title: notification.title,
      message: notification.message,
      type: 'warning',
      link: '/matches?filter=missing',
    });

    recipientLog.push(toRecipientAuditEntry(user, 'sent'));
  });

  const sent = recipientLog.filter((entry) => entry.status === 'sent').length;
  const skipped = recipientLog.filter((entry) => entry.status === 'skipped').length;

  return {
    sent,
    skipped,
    recipients: recipientLog,
    message: `${sent} Erinnerung${sent === 1 ? '' : 'en'} gesendet.`,
  };
}

async function sendUpcomingMatchesSummary() {
  if (!(await isEmailRemindersEnabled())) return { skipped: true };

  const users = await getReminderRecipients();
  const upcoming = await Match.findAll({
    where: {
      kickoffTime: {
        [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
      },
      status: 'scheduled',
    },
    order: [['kickoffTime', 'ASC']],
    limit: 10,
  });

  await runWithConcurrency(users, async (user) => {
    const template = emailService.templateUpcomingMatches(user, upcoming);
    await emailService.sendEmail({ to: user.email, ...template });
  });

  return { sent: users.length };
}

async function sendBonusQuestionReminders() {
  if (!(await isEmailRemindersEnabled())) return { skipped: true };

  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const questions = await BonusQuestion.findAll({
    where: {
      status: 'open',
      lockTime: { [Op.between]: [new Date(), in24h] },
    },
  });

  if (questions.length === 0) return { sent: 0 };

  const users = await getReminderRecipients();
  const questionIds = questions.map((q) => q.id);
  const existingPredictions = await BonusPrediction.findAll({
    where: { bonusQuestionId: { [Op.in]: questionIds } },
    attributes: ['userId', 'bonusQuestionId'],
  });

  const answered = new Set(
    existingPredictions.map((p) => `${p.userId}:${p.bonusQuestionId}`)
  );

  const jobs = [];
  for (const question of questions) {
    for (const user of users) {
      if (answered.has(`${user.id}:${question.id}`)) continue;
      jobs.push({ user, question });
    }
  }

  await runWithConcurrency(jobs, async ({ user, question }) => {
    const template = emailService.templateBonusReminder(user, question);
    await emailService.sendEmail({ to: user.email, ...template });

    await notificationService.createNotification({
      userId: user.id,
      title: 'Bonusfrage schließt bald',
      message: question.questionText,
      type: 'warning',
      link: '/bonus',
    });
  });

  return { sent: jobs.length };
}

async function sendSyncErrorToAdmin(errorMessage) {
  const enabled = await getSetting('adminSyncErrorEmails', true);
  if (!enabled) return;

  const { User } = require('../models');
  const admins = await User.findAll({ where: { role: 'admin' } });
  await runWithConcurrency(admins, async (admin) => {
    const template = emailService.templateSyncError(errorMessage, admin);
    await emailService.sendEmail({ to: admin.email, ...template });
  });
}

async function sendLeaderboardUpdates() {
  if (!(await isEmailRemindersEnabled())) return { skipped: true };

  const leaderboard = await getLeaderboard();
  const users = await getReminderRecipients();

  const recipients = users
    .map((user) => ({ user, entry: leaderboard.find((e) => e.userId === user.id) }))
    .filter(({ entry }) => entry);

  await runWithConcurrency(recipients, async ({ user, entry }) => {
    const template = emailService.templateLeaderboardUpdate(user, entry.rank, entry.totalPoints);
    await emailService.sendEmail({ to: user.email, ...template });
  });

  return { sent: recipients.length };
}

module.exports = {
  getReminderRecipients,
  sendMissingPredictionReminders,
  sendUpcomingMatchesSummary,
  sendBonusQuestionReminders,
  sendSyncErrorToAdmin,
  sendLeaderboardUpdates,
};
