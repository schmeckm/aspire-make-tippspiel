const { Op } = require('sequelize');
const { User, Match, Prediction, BonusQuestion, BonusPrediction } = require('../models');
const emailService = require('./emailService');
const reminderEmailService = require('./reminderEmailService');
const notificationService = require('./notificationService');
const { getSetting } = require('./settingsService');
const { getLeaderboard } = require('./leaderboardService');

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

async function sendMissingPredictionReminders() {
  const enabled = await getSetting('emailRemindersEnabled', false);
  if (!enabled) {
    return { skipped: true, message: 'E-Mail-Erinnerungen deaktiviert.' };
  }

  const users = await getReminderRecipients();
  const openMatches = await Match.findAll({
    where: {
      status: 'scheduled',
      kickoffTime: { [Op.gt]: new Date() },
      isManuallyLocked: false,
    },
  });

  let sent = 0;
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const upcoming = openMatches.filter((m) => new Date(m.kickoffTime) <= in48h);

  if (users.length === 0) {
    return { sent: 0, message: 'Keine Empfänger gefunden (registrierte Spieler mit bestätigter E-Mail).' };
  }

  for (const user of users) {
    const predictions = await Prediction.findAll({
      where: { userId: user.id, matchId: openMatches.map((m) => m.id) },
    });
    const predictedIds = new Set(predictions.map((p) => p.matchId));
    const missing = openMatches.filter((m) => !predictedIds.has(m.id));

    if (missing.length === 0) continue;

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

    sent++;
  }

  if (sent === 0) {
    return { sent: 0, message: 'Keine Erinnerungen nötig – alle Spieler haben ihre offenen Tipps abgegeben.' };
  }
  return { sent, message: `${sent} Erinnerungen gesendet.` };
}

async function sendUpcomingMatchesSummary() {
  const enabled = await getSetting('emailRemindersEnabled', false);
  if (!enabled) return { skipped: true };

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

  let sent = 0;
  for (const user of users) {
    const template = emailService.templateUpcomingMatches(user, upcoming);
    await emailService.sendEmail({ to: user.email, ...template });
    sent++;
  }

  return { sent };
}

async function sendBonusQuestionReminders() {
  const enabled = await getSetting('emailRemindersEnabled', false);
  if (!enabled) return { skipped: true };

  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const questions = await BonusQuestion.findAll({
    where: {
      status: 'open',
      lockTime: { [Op.between]: [new Date(), in24h] },
    },
  });

  if (questions.length === 0) return { sent: 0 };

  const users = await getReminderRecipients();
  let sent = 0;

  for (const question of questions) {
    for (const user of users) {
      const existing = await BonusPrediction.findOne({
        where: { userId: user.id, bonusQuestionId: question.id },
      });
      if (existing) continue;

      const template = emailService.templateBonusReminder(user, question);
      await emailService.sendEmail({ to: user.email, ...template });

      await notificationService.createNotification({
        userId: user.id,
        title: 'Bonusfrage schließt bald',
        message: question.questionText,
        type: 'warning',
        link: '/bonus',
      });

      sent++;
    }
  }

  return { sent };
}

async function sendSyncErrorToAdmin(errorMessage) {
  const enabled = await getSetting('adminSyncErrorEmails', true);
  if (!enabled) return;

  const { User } = require('../models');
  const admins = await User.findAll({ where: { role: 'admin' } });
  const template = emailService.templateSyncError(errorMessage);

  for (const admin of admins) {
    await emailService.sendEmail({ to: admin.email, ...template });
  }
}

async function sendLeaderboardUpdates() {
  const enabled = await getSetting('emailRemindersEnabled', false);
  if (!enabled) return { skipped: true };

  const leaderboard = await getLeaderboard();
  const users = await getReminderRecipients();

  let sent = 0;
  for (const user of users) {
    const entry = leaderboard.find((e) => e.userId === user.id);
    if (!entry) continue;

    const template = emailService.templateLeaderboardUpdate(user, entry.rank, entry.totalPoints);
    await emailService.sendEmail({ to: user.email, ...template });
    sent++;
  }

  return { sent };
}

module.exports = {
  sendMissingPredictionReminders,
  sendUpcomingMatchesSummary,
  sendBonusQuestionReminders,
  sendSyncErrorToAdmin,
  sendLeaderboardUpdates,
};
