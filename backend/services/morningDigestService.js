const { Op } = require('sequelize');
const { User, Team, Match, Prediction, LeaderboardSnapshot } = require('../models');
const emailService = require('./emailService');
const { getAppUrl } = require('./authTokenService');
const { t, resolveUserEmailLocale, SUPPORTED_LOCALES } = require('./i18nService');
const { escapeHtml, wrapBrandedEmail } = require('./emailLayoutService');
const { getLeaderboard, getTeamRanking, getScoringRules } = require('./leaderboardService');
const { calculatePoints, classifyPrediction } = require('./pointsCalculationService');
const { formatMatchListHtml, formatMatchListText } = require('./reminderEmailService');
const { runWithConcurrency } = require('./emailQueueService');
const {
  toRecipientAuditEntry,
  loadUsersByIds,
  getMissingPredictionData,
  formatRankingListHtml,
} = require('./adminUserEmailService');
const { getReminderRecipients } = require('./reminderService');
const { getSetting, setSetting } = require('./settingsService');
const { isMorningDigestEnabled } = require('./emailReminderSettingsService');
const notificationService = require('./notificationService');
const { getLatestLeaderboardSummary } = require('./aiLeaderboardService');
const { checkAiAvailability } = require('./llmService');

const TOP_PLAYERS = 5;
const TOP_TEAMS = 3;
const NIGHT_WINDOW_HOURS = 18;

function getDigestTimezone() {
  return process.env.REMINDER_TIMEZONE
    || process.env.DEFAULT_TIMEZONE
    || process.env.SENTRY_CRON_TIMEZONE
    || 'Europe/Zurich';
}

function getDateStringInTimezone(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
}

function formatResultLine(match) {
  return `${match.homeTeam} ${match.homeScore}:${match.awayScore} ${match.awayTeam}`;
}

function formatFinishedMatchListHtml(matches, locale) {
  if (!matches.length) {
    return `<p style="margin:0;">${escapeHtml(t('emails.morningDigest.noLastNight', locale))}</p>`;
  }
  const items = matches.map((m) => `<li>${escapeHtml(formatResultLine(m))}</li>`).join('');
  return `<ul style="margin:12px 0;padding-left:20px;">${items}</ul>`;
}

function formatFinishedMatchListText(matches, locale) {
  if (!matches.length) return t('emails.morningDigest.noLastNight', locale);
  return matches.map((m) => `- ${formatResultLine(m)}`).join('\n');
}

function formatRankDelta(rankDelta, locale) {
  if (!rankDelta || rankDelta === 0) {
    return t('emails.morningDigest.rankUnchanged', locale);
  }
  const places = Math.abs(rankDelta);
  if (rankDelta > 0) {
    const key = places === 1 ? 'emails.morningDigest.rankUpOne' : 'emails.morningDigest.rankUpMany';
    return t(key, locale, { places });
  }
  const key = places === 1 ? 'emails.morningDigest.rankDownOne' : 'emails.morningDigest.rankDownMany';
  return t(key, locale, { places });
}

function formatHighlightsHtml(highlights, locale) {
  if (!highlights.length) {
    return `<p style="margin:0;">${escapeHtml(t('emails.morningDigest.noHighlights', locale))}</p>`;
  }
  const items = highlights.map((h) => {
    const text = t(`emails.morningDigest.highlight.${h.key}`, locale, h.params);
    return `<li>${escapeHtml(text)}</li>`;
  }).join('');
  return `<ul style="margin:12px 0;padding-left:20px;">${items}</ul>`;
}

function formatHighlightsText(highlights, locale) {
  if (!highlights.length) return t('emails.morningDigest.noHighlights', locale);
  return highlights.map((h) => `- ${t(`emails.morningDigest.highlight.${h.key}`, locale, h.params)}`).join('\n');
}

async function getYesterdayRanks() {
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const snapshotTime = await LeaderboardSnapshot.max('snapshotTime', {
    where: { snapshotTime: { [Op.lte]: cutoff } },
  });
  if (!snapshotTime) return {};

  const snapshots = await LeaderboardSnapshot.findAll({ where: { snapshotTime } });
  const map = {};
  for (const s of snapshots) {
    map[s.userId] = { rank: s.rank, totalPoints: s.totalPoints };
  }
  return map;
}

async function getLastNightMatches(timezone) {
  const now = new Date();
  const from = new Date(now.getTime() - NIGHT_WINDOW_HOURS * 60 * 60 * 1000);
  return Match.findAll({
    where: {
      status: 'finished',
      kickoffTime: { [Op.between]: [from, now] },
    },
    order: [['kickoffTime', 'ASC']],
  });
}

async function getTodayMatches(timezone) {
  const todayStr = getDateStringInTimezone(new Date(), timezone);
  const matches = await Match.findAll({
    where: {
      status: 'scheduled',
      kickoffTime: { [Op.gt]: new Date() },
      isManuallyLocked: false,
    },
    order: [['kickoffTime', 'ASC']],
    limit: 50,
  });
  return matches.filter((m) => getDateStringInTimezone(new Date(m.kickoffTime), timezone) === todayStr);
}

async function computePointsEarnedLastNight(matchIds) {
  if (matchIds.length === 0) return new Map();

  const scoringRules = await getScoringRules();
  const predictions = await Prediction.findAll({
    where: { matchId: { [Op.in]: matchIds } },
    include: [{ model: Match, as: 'match' }],
  });

  const earned = new Map();
  for (const prediction of predictions) {
    if (!prediction.match || prediction.match.status !== 'finished') continue;
    const points = calculatePoints(prediction, prediction.match, scoringRules) || 0;
    earned.set(prediction.userId, (earned.get(prediction.userId) || 0) + points);
  }
  return earned;
}

function buildRuleHighlights(lastNightMatches, predictions, scoringRules, usersById) {
  if (lastNightMatches.length === 0) return [];

  const matchIds = new Set(lastNightMatches.map((m) => m.id));
  const relevant = predictions.filter((p) => matchIds.has(p.matchId) && p.match?.status === 'finished');
  const highlights = [];

  const pointsByMatch = new Map();
  const exactByMatch = new Map();
  const exactByUser = new Map();
  const pointsByUser = new Map();

  for (const prediction of relevant) {
    const points = calculatePoints(prediction, prediction.match, scoringRules) || 0;
    const classification = classifyPrediction(prediction, prediction.match, scoringRules);

    pointsByMatch.set(prediction.matchId, (pointsByMatch.get(prediction.matchId) || 0) + points);
    pointsByUser.set(prediction.userId, (pointsByUser.get(prediction.userId) || 0) + points);

    if (classification === 'exact') {
      exactByMatch.set(prediction.matchId, (exactByMatch.get(prediction.matchId) || 0) + 1);
      exactByUser.set(prediction.userId, (exactByUser.get(prediction.userId) || 0) + 1);
    }
  }

  let topMatch = null;
  let topMatchPoints = -1;
  for (const match of lastNightMatches) {
    const total = pointsByMatch.get(match.id) || 0;
    if (total > topMatchPoints) {
      topMatchPoints = total;
      topMatch = match;
    }
  }
  if (topMatch) {
    highlights.push({
      key: 'matchOfNight',
      params: {
        homeTeam: topMatch.homeTeam,
        awayTeam: topMatch.awayTeam,
        homeScore: topMatch.homeScore,
        awayScore: topMatch.awayScore,
        totalPoints: topMatchPoints,
      },
    });
  }

  let topExactMatch = null;
  let topExactCount = 0;
  for (const match of lastNightMatches) {
    const count = exactByMatch.get(match.id) || 0;
    if (count > topExactCount) {
      topExactCount = count;
      topExactMatch = match;
    }
  }
  if (topExactMatch && topExactCount > 0) {
    highlights.push({
      key: 'mostExactTips',
      params: {
        count: topExactCount,
        homeTeam: topExactMatch.homeTeam,
        awayTeam: topExactMatch.awayTeam,
      },
    });
  }

  let topUserId = null;
  let topUserPoints = 0;
  for (const [userId, pts] of pointsByUser) {
    if (pts > topUserPoints) {
      topUserPoints = pts;
      topUserId = userId;
    }
  }
  if (topUserId && topUserPoints > 0) {
    const user = usersById.get(topUserId);
    const name = user ? `${user.firstName} ${user.lastName}`.trim() : t('emails.morningDigest.highlight.unknownPlayer', 'de');
    highlights.push({
      key: 'topScorer',
      params: { name, points: topUserPoints },
    });
  }

  let surpriseMatch = null;
  let lowestAvg = Infinity;
  for (const match of lastNightMatches) {
    const matchPreds = relevant.filter((p) => p.matchId === match.id);
    if (matchPreds.length === 0) continue;
    const total = pointsByMatch.get(match.id) || 0;
    const avg = total / matchPreds.length;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      surpriseMatch = match;
    }
  }
  if (surpriseMatch && lowestAvg < 2) {
    highlights.push({
      key: 'surpriseResult',
      params: {
        homeTeam: surpriseMatch.homeTeam,
        awayTeam: surpriseMatch.awayTeam,
        homeScore: surpriseMatch.homeScore,
        awayScore: surpriseMatch.awayScore,
      },
    });
  }

  return highlights.slice(0, 3);
}

async function loadAiHighlightsByLocale() {
  const result = {};
  for (const locale of SUPPORTED_LOCALES) {
    const availability = checkAiAvailability('leaderboard_summary', locale);
    if (!availability.available) continue;
    try {
      const summary = await getLatestLeaderboardSummary(null, locale);
      if (summary?.content) {
        result[locale] = {
          content: summary.content,
          disclaimer: summary.disclaimer || '',
        };
      }
    } catch {
      // AI highlight is optional
    }
  }
  return result;
}

async function buildSharedDigestData() {
  const timezone = getDigestTimezone();
  const lastNightMatches = await getLastNightMatches(timezone);
  const todayMatches = await getTodayMatches(timezone);
  const leaderboard = await getLeaderboard();
  const teamRanking = await getTeamRanking();
  const yesterdayRanks = await getYesterdayRanks();
  const scoringRules = await getScoringRules();

  const matchIds = lastNightMatches.map((m) => m.id);
  const pointsEarned = await computePointsEarnedLastNight(matchIds);

  const predictions = matchIds.length > 0
    ? await Prediction.findAll({
      where: { matchId: { [Op.in]: matchIds } },
      include: [{ model: Match, as: 'match' }],
    })
    : [];

  const allUsers = await User.findAll({ attributes: ['id', 'firstName', 'lastName'] });
  const usersById = new Map(allUsers.map((u) => [u.id, u]));
  const ruleHighlights = buildRuleHighlights(lastNightMatches, predictions, scoringRules, usersById);
  const aiHighlights = await loadAiHighlightsByLocale();

  return {
    timezone,
    lastNightMatches,
    todayMatches,
    leaderboard,
    teamRanking,
    yesterdayRanks,
    pointsEarned,
    topUsers: leaderboard.slice(0, TOP_PLAYERS),
    topTeams: teamRanking.slice(0, TOP_TEAMS),
    ruleHighlights,
    aiHighlights,
  };
}

function buildUserDigestData(user, shared) {
  const userEntry = shared.leaderboard.find((e) => e.userId === user.id) || null;
  const teamEntry = user.teamId
    ? shared.teamRanking.find((e) => e.teamId === user.teamId) || null
    : null;

  const yesterday = shared.yesterdayRanks[user.id];
  const rankDelta = userEntry && yesterday ? yesterday.rank - userEntry.rank : 0;
  const pointsEarned = shared.pointsEarned.get(user.id) || 0;
  const pointsDelta = userEntry && yesterday
    ? userEntry.totalPoints - yesterday.totalPoints
    : pointsEarned;

  return {
    userEntry,
    teamEntry,
    rankDelta,
    pointsEarned,
    pointsDelta,
  };
}

function templateMorningDigest(user, shared, userData, { preview = false } = {}) {
  const locale = resolveUserEmailLocale(user);
  const link = `${getAppUrl()}/leaderboard`;
  const greeting = t('emails.morningDigest.greeting', locale, { firstName: user.firstName });

  let personalHtml = '';
  if (userData.userEntry) {
    personalHtml += `<p style="margin:0 0 8px;">${escapeHtml(t('emails.morningDigest.yourRank', locale, {
      rank: userData.userEntry.rank,
      points: userData.userEntry.totalPoints,
    }))}</p>`;
    if (userData.rankDelta !== 0 || userData.pointsEarned > 0) {
      personalHtml += `<p style="margin:0 0 12px;">${escapeHtml(formatRankDelta(userData.rankDelta, locale))}`;
      if (userData.pointsEarned > 0) {
        personalHtml += ` ${escapeHtml(t('emails.morningDigest.pointsEarned', locale, { points: userData.pointsEarned }))}`;
      }
      personalHtml += '</p>';
    }
  } else {
    personalHtml += `<p style="margin:0 0 12px;">${escapeHtml(t('emails.morningDigest.notRanked', locale))}</p>`;
  }

  if (userData.teamEntry) {
    personalHtml += `<p style="margin:0 0 12px;">${escapeHtml(t('emails.morningDigest.yourTeam', locale, {
      teamName: userData.teamEntry.teamName,
      rank: userData.teamEntry.rank,
      points: userData.teamEntry.averagePoints,
    }))}</p>`;
  } else if (user.team?.name) {
    personalHtml += `<p style="margin:0 0 12px;">${escapeHtml(t('emails.morningDigest.teamNotRanked', locale, {
      teamName: user.team.name,
    }))}</p>`;
  }

  const lastNightHtml = formatFinishedMatchListHtml(shared.lastNightMatches, locale);
  const todayHtml = formatMatchListHtml(shared.todayMatches, locale);
  const leaderboardHtml = formatRankingListHtml(
    shared.topUsers.map((entry) => ({
      rank: entry.rank,
      name: `${entry.firstName} ${entry.lastName}`,
      points: entry.totalPoints,
    })),
    locale,
  );
  const teamHtml = formatRankingListHtml(
    shared.topTeams.map((entry) => ({
      rank: entry.rank,
      name: entry.teamName,
      points: entry.averagePoints,
    })),
    locale,
    'name',
    'points',
  );

  const ruleHighlightsHtml = formatHighlightsHtml(shared.ruleHighlights, locale);
  const aiBlock = shared.aiHighlights[locale];
  let aiHtml = '';
  let aiText = '';
  if (aiBlock?.content) {
    aiHtml = `
      <p style="margin:0 0 8px;">${escapeHtml(aiBlock.content)}</p>
      ${aiBlock.disclaimer ? `<p style="margin:0;font-size:12px;color:#666;">${escapeHtml(aiBlock.disclaimer)}</p>` : ''}
    `.trim();
    aiText = `${aiBlock.content}${aiBlock.disclaimer ? `\n${aiBlock.disclaimer}` : ''}`;
  }

  const missingBlock = userData.missingCount > 0
    ? `
    <p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(t('emails.morningDigest.missingTipsHeading', locale))}</p>
    <p style="margin:0 0 8px;">${escapeHtml(t('emails.morningDigest.missingTips', locale, { count: userData.missingCount }))}</p>
    ${formatMatchListHtml(userData.missingMatches || [], locale)}
  `.trim()
    : '';

  const bodyHtml = `
    <p style="margin:0 0 16px;">${escapeHtml(t('emails.morningDigest.intro', locale))}</p>
    <p style="margin:0 0 8px;font-weight:600;">${escapeHtml(t('emails.morningDigest.lastNightHeading', locale))}</p>
    ${lastNightHtml}
    <p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(t('emails.morningDigest.yourStandHeading', locale))}</p>
    ${personalHtml}
    <p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(t('emails.morningDigest.leaderboardHeading', locale))}</p>
    ${leaderboardHtml}
    <p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(t('emails.morningDigest.teamHeading', locale))}</p>
    ${teamHtml}
    <p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(t('emails.morningDigest.highlightHeading', locale))}</p>
    ${ruleHighlightsHtml}
    ${aiHtml ? `<p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(t('emails.morningDigest.aiHighlightHeading', locale))}</p>${aiHtml}` : ''}
    <p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(t('emails.morningDigest.todayHeading', locale))}</p>
    ${todayHtml}
    ${missingBlock}
  `.trim();

  const lastNightText = formatFinishedMatchListText(shared.lastNightMatches, locale);
  const todayText = formatMatchListText(shared.todayMatches, locale);
  const missingMatchListText = formatMatchListText(userData.missingMatches || [], locale);
  const highlightsText = formatHighlightsText(shared.ruleHighlights, locale);

  return {
    subject: t('emails.morningDigest.subject', locale),
    html: wrapBrandedEmail({
      locale,
      title: t('emails.morningDigest.title', locale),
      greeting,
      bodyHtml,
      ctaHref: link,
      ctaLabel: t('emails.morningDigest.cta', locale),
    }),
    text: t('emails.morningDigest.text', locale, {
      firstName: user.firstName,
      lastNightText,
      rank: userData.userEntry?.rank ?? '–',
      points: userData.userEntry?.totalPoints ?? 0,
      rankDelta: formatRankDelta(userData.rankDelta, locale),
      pointsEarned: userData.pointsEarned,
      teamName: userData.teamEntry?.teamName ?? user.team?.name ?? '–',
      teamRank: userData.teamEntry?.rank ?? '–',
      highlightsText,
      aiText,
      todayText,
      missingCount: userData.missingCount ?? 0,
      missingMatchListText,
      link,
    }),
    locale,
    preview,
  };
}

async function buildDigestForUser(user, shared) {
  const base = buildUserDigestData(user, shared);
  const { missingCount, missingMatches } = await getMissingPredictionData(user.id);
  return templateMorningDigest(user, shared, { ...base, missingCount, missingMatches });
}

async function previewMorningDigest(userId) {
  const users = await loadUsersByIds([userId]);
  if (users.length === 0) {
    return { error: 'User not found' };
  }
  const shared = await buildSharedDigestData();
  return buildDigestForUser(users[0], shared);
}

async function shouldSendDigestToday(timezone, { force = false } = {}) {
  if (force) return true;
  const lastSent = await getSetting('lastDigestSentDate', null);
  const todayStr = getDateStringInTimezone(new Date(), timezone);
  return lastSent !== todayStr;
}

async function markDigestSentToday(timezone) {
  await setSetting('lastDigestSentDate', getDateStringInTimezone(new Date(), timezone));
}

async function sendMorningDigests({ force = false } = {}) {
  const enabled = force || await isMorningDigestEnabled();
  if (!enabled) {
    return { skipped: true, message: 'Morning Digest deaktiviert oder SMTP nicht bereit.' };
  }

  const shared = await buildSharedDigestData();
  if (!(await shouldSendDigestToday(shared.timezone, { force }))) {
    return { skipped: true, message: 'Morning Digest wurde heute bereits gesendet.' };
  }

  const users = await getReminderRecipients();
  if (users.length === 0) {
    return { sent: 0, skipped: 0, recipients: [], message: 'Keine Empfänger gefunden.' };
  }

  const usersWithTeam = await User.findAll({
    where: { id: { [Op.in]: users.map((u) => u.id) } },
    include: [{ model: Team, as: 'team' }],
  });
  const userMap = new Map(usersWithTeam.map((u) => [u.id, u]));

  const recipientLog = [];

  await runWithConcurrency(users, async (user) => {
    const fullUser = userMap.get(user.id) || user;
    if (!fullUser.email) {
      recipientLog.push(toRecipientAuditEntry(fullUser, 'skipped', 'no_email'));
      return;
    }

    const template = await buildDigestForUser(fullUser, shared);
    await emailService.sendEmail({ to: fullUser.email, ...template });

    const locale = resolveUserEmailLocale(fullUser);
    await notificationService.createNotification({
      userId: fullUser.id,
      title: t('emails.morningDigest.notificationTitle', locale),
      message: t('emails.morningDigest.notificationBody', locale, {
        matchCount: shared.lastNightMatches.length,
      }),
      type: 'info',
      link: '/leaderboard',
    });

    recipientLog.push(toRecipientAuditEntry(fullUser, 'sent'));
  });

  const sent = recipientLog.filter((e) => e.status === 'sent').length;
  const skipped = recipientLog.filter((e) => e.status === 'skipped').length;

  if (sent > 0) {
    await markDigestSentToday(shared.timezone);
  }

  return {
    sent,
    skipped,
    recipients: recipientLog,
    message: `${sent} Morning Digest${sent === 1 ? '' : 's'} gesendet.`,
  };
}

async function sendMorningDigestsToUsers(userIds, { force = true } = {}) {
  const users = await loadUsersByIds(userIds);
  if (users.length === 0) {
    return { sent: 0, skipped: 0, recipients: [], message: 'Keine gültigen Empfänger ausgewählt.' };
  }

  const shared = await buildSharedDigestData();
  let sent = 0;
  let skipped = 0;
  const recipients = [];

  for (const user of users) {
    if (!user.email) {
      skipped += 1;
      recipients.push(toRecipientAuditEntry(user, 'skipped', 'no_email'));
      continue;
    }
    const template = await buildDigestForUser(user, shared);
    await emailService.sendEmail({ to: user.email, ...template });
    sent += 1;
    recipients.push(toRecipientAuditEntry(user, 'sent'));
  }

  return {
    sent,
    skipped,
    recipients,
    message: sent > 0
      ? `${sent} Morning Digest${sent === 1 ? '' : 's'} gesendet.`
      : 'Keine E-Mails gesendet.',
  };
}

module.exports = {
  buildSharedDigestData,
  buildUserDigestData,
  templateMorningDigest,
  previewMorningDigest,
  sendMorningDigests,
  sendMorningDigestsToUsers,
  getDigestTimezone,
};
