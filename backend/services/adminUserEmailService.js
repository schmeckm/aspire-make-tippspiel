const { Op } = require('sequelize');
const { User, Team, Match, Prediction } = require('../models');
const emailService = require('./emailService');
const { getAppUrl } = require('./authTokenService');
const { t, resolveUserEmailLocale } = require('./i18nService');
const { escapeHtml, wrapBrandedEmail } = require('./emailLayoutService');
const { getLeaderboard, getTeamRanking } = require('./leaderboardService');
const { formatMatchListHtml, formatMatchListText } = require('./reminderEmailService');

const TOP_LIST_SIZE = 5;

function formatRankingListHtml(items, locale, nameKey = 'name', pointsKey = 'points') {
  if (!items.length) {
    return `<p style="margin:0;">${escapeHtml(t('emails.statusUpdate.noEntries', locale))}</p>`;
  }
  const rows = items.map((item) => {
    const name = item[nameKey] ?? item.teamName ?? item.label;
    const points = item[pointsKey] ?? item.totalPoints ?? item.averagePoints ?? 0;
    return `<li>#${item.rank} ${escapeHtml(name)} – ${escapeHtml(String(points))} ${escapeHtml(t('emails.statusUpdate.points', locale))}</li>`;
  }).join('');
  return `<ol style="margin:12px 0;padding-left:20px;">${rows}</ol>`;
}

function templateManualTipReminder(user, missingCount, upcomingMatches) {
  const locale = resolveUserEmailLocale(user);
  const link = `${getAppUrl()}/matches?filter=missing`;
  const greeting = t('emails.manualTipReminder.greeting', locale, { firstName: user.firstName });
  const body = missingCount > 0
    ? t('emails.manualTipReminder.bodyWithMissing', locale, { missingCount })
    : t('emails.manualTipReminder.bodyGeneric', locale);
  const upcomingHeading = missingCount > 0
    ? t('emails.missingPredictions.upcomingHeading', locale)
    : '';
  const matchListHtml = missingCount > 0 ? formatMatchListHtml(upcomingMatches, locale) : '';
  const matchListText = missingCount > 0 ? formatMatchListText(upcomingMatches, locale) : '';
  const cta = t('emails.manualTipReminder.cta', locale);

  return {
    subject: t('emails.manualTipReminder.subject', locale),
    html: wrapBrandedEmail({
      locale,
      title: t('emails.manualTipReminder.title', locale),
      greeting,
      bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(body)}</p>
        ${upcomingHeading ? `<p style="margin:0 0 8px;font-weight:600;">${escapeHtml(upcomingHeading)}</p>` : ''}
        ${matchListHtml}
      `.trim(),
      ctaHref: link,
      ctaLabel: cta,
    }),
    text: t('emails.manualTipReminder.text', locale, {
      firstName: user.firstName,
      missingCount,
      matchListText,
      link,
    }),
  };
}

function templateStatusUpdate(user, {
  userEntry,
  topUsers,
  teamEntry,
  topTeams,
}) {
  const locale = resolveUserEmailLocale(user);
  const link = `${getAppUrl()}/leaderboard`;
  const greeting = t('emails.statusUpdate.greeting', locale, { firstName: user.firstName });

  let personalHtml = '';
  if (userEntry) {
    personalHtml += `<p style="margin:0 0 12px;">${escapeHtml(t('emails.statusUpdate.yourRank', locale, {
      rank: userEntry.rank,
      points: userEntry.totalPoints,
    }))}</p>`;
  } else {
    personalHtml += `<p style="margin:0 0 12px;">${escapeHtml(t('emails.statusUpdate.notRanked', locale))}</p>`;
  }

  if (teamEntry) {
    personalHtml += `<p style="margin:0 0 12px;">${escapeHtml(t('emails.statusUpdate.yourTeam', locale, {
      teamName: teamEntry.teamName,
      rank: teamEntry.rank,
      points: teamEntry.averagePoints,
    }))}</p>`;
  } else if (user.team?.name) {
    personalHtml += `<p style="margin:0 0 12px;">${escapeHtml(t('emails.statusUpdate.teamNotRanked', locale, {
      teamName: user.team.name,
    }))}</p>`;
  }

  const leaderboardHtml = formatRankingListHtml(
    topUsers.map((entry) => ({
      rank: entry.rank,
      name: `${entry.firstName} ${entry.lastName}`,
      points: entry.totalPoints,
    })),
    locale,
  );

  const teamHtml = formatRankingListHtml(
    topTeams.map((entry) => ({
      rank: entry.rank,
      name: entry.teamName,
      points: entry.averagePoints,
    })),
    locale,
    'name',
    'points',
  );

  return {
    subject: t('emails.statusUpdate.subject', locale),
    html: wrapBrandedEmail({
      locale,
      title: t('emails.statusUpdate.title', locale),
      greeting,
      bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(t('emails.statusUpdate.intro', locale))}</p>
        ${personalHtml}
        <p style="margin:0 0 8px;font-weight:600;">${escapeHtml(t('emails.statusUpdate.leaderboardHeading', locale))}</p>
        ${leaderboardHtml}
        <p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(t('emails.statusUpdate.teamHeading', locale))}</p>
        ${teamHtml}
      `.trim(),
      ctaHref: link,
      ctaLabel: t('emails.statusUpdate.cta', locale),
    }),
    text: t('emails.statusUpdate.text', locale, {
      firstName: user.firstName,
      rank: userEntry?.rank ?? '–',
      points: userEntry?.totalPoints ?? 0,
      teamName: teamEntry?.teamName ?? user.team?.name ?? '–',
      teamRank: teamEntry?.rank ?? '–',
      link,
    }),
  };
}

function toRecipientAuditEntry(user, status = 'sent', reason = null) {
  return {
    userId: user.id,
    email: user.email || null,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    status,
    ...(reason ? { reason } : {}),
  };
}

async function loadUsersByIds(userIds) {
  const ids = [...new Set(userIds.map((id) => parseInt(id, 10)).filter(Number.isFinite))];
  if (ids.length === 0) return [];

  return User.findAll({
    where: { id: { [Op.in]: ids } },
    include: [{ model: Team, as: 'team' }],
  });
}

async function getMissingPredictionData(userId) {
  const openMatches = await Match.findAll({
    where: {
      status: 'scheduled',
      kickoffTime: { [Op.gt]: new Date() },
      isManuallyLocked: false,
    },
  });

  const predictions = await Prediction.findAll({
    where: { userId, matchId: openMatches.map((m) => m.id) },
  });
  const predictedIds = new Set(predictions.map((p) => p.matchId));
  const missing = openMatches.filter((m) => !predictedIds.has(m.id));

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const upcoming = openMatches.filter((m) => new Date(m.kickoffTime) <= in48h);

  return {
    missingCount: missing.length,
    upcomingMatches: upcoming.slice(0, 5),
  };
}

async function sendTipRemindersToUsers(userIds) {
  const users = await loadUsersByIds(userIds);
  if (users.length === 0) {
    return { sent: 0, skipped: 0, recipients: [], message: 'Keine gültigen Empfänger ausgewählt.' };
  }

  let sent = 0;
  let skipped = 0;
  const recipients = [];

  for (const user of users) {
    if (!user.email) {
      skipped += 1;
      recipients.push(toRecipientAuditEntry(user, 'skipped', 'no_email'));
      continue;
    }
    const { missingCount, upcomingMatches } = await getMissingPredictionData(user.id);
    const template = templateManualTipReminder(user, missingCount, upcomingMatches);
    await emailService.sendEmail({ to: user.email, ...template });
    sent += 1;
    recipients.push(toRecipientAuditEntry(user, 'sent'));
  }

  return {
    sent,
    skipped,
    recipients,
    message: sent > 0
      ? `${sent} Tipp-Erinnerung${sent === 1 ? '' : 'en'} gesendet.`
      : 'Keine E-Mails gesendet.',
  };
}

async function sendStatusUpdatesToUsers(userIds) {
  const users = await loadUsersByIds(userIds);
  if (users.length === 0) {
    return { sent: 0, skipped: 0, recipients: [], message: 'Keine gültigen Empfänger ausgewählt.' };
  }

  const leaderboard = await getLeaderboard();
  const teamRanking = await getTeamRanking();
  const topUsers = leaderboard.slice(0, TOP_LIST_SIZE);
  const topTeams = teamRanking.slice(0, TOP_LIST_SIZE);

  let sent = 0;
  let skipped = 0;
  const recipients = [];

  for (const user of users) {
    if (!user.email) {
      skipped += 1;
      recipients.push(toRecipientAuditEntry(user, 'skipped', 'no_email'));
      continue;
    }

    const userEntry = leaderboard.find((entry) => entry.userId === user.id) || null;
    const teamEntry = user.teamId
      ? teamRanking.find((entry) => entry.teamId === user.teamId) || null
      : null;

    const template = templateStatusUpdate(user, {
      userEntry,
      topUsers,
      teamEntry,
      topTeams,
    });
    await emailService.sendEmail({ to: user.email, ...template });
    sent += 1;
    recipients.push(toRecipientAuditEntry(user, 'sent'));
  }

  return {
    sent,
    skipped,
    recipients,
    message: sent > 0
      ? `${sent} Status-Update${sent === 1 ? '' : 's'} gesendet.`
      : 'Keine E-Mails gesendet.',
  };
}

module.exports = {
  sendTipRemindersToUsers,
  sendStatusUpdatesToUsers,
  toRecipientAuditEntry,
  formatRankingListHtml,
  templateManualTipReminder,
  templateStatusUpdate,
};
