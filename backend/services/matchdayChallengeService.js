const { Op } = require('sequelize');
const { User, Team, Prediction, Match } = require('../models');
const { ensureRedis, redisGet, redisSet } = require('./redisClient');

const CACHE_TTL_MS = Number.parseInt(process.env.CHALLENGE_CACHE_TTL_MS || '30000', 10);
const REDIS_CACHE_PREFIX = 'wm2026:challenge:matchday:';

function formatLocalDate(date, timeZone) {
  // Stable YYYY-MM-DD output
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map((v) => Number.parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + days, 0, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number.parseInt(map.year, 10),
    Number.parseInt(map.month, 10) - 1,
    Number.parseInt(map.day, 10),
    Number.parseInt(map.hour, 10),
    Number.parseInt(map.minute, 10),
    Number.parseInt(map.second, 10),
  );
  return asUtc - date.getTime();
}

function localMidnightUtcMs(dateStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map((v) => Number.parseInt(v, 10));
  // Start with a guess and refine once (handles DST transitions).
  let guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  for (let i = 0; i < 2; i++) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    const next = Date.UTC(y, m - 1, d, 0, 0, 0) - offset;
    if (Math.abs(next - guess) < 1000) return next;
    guess = next;
  }
  return guess;
}

function localDateUtcRange(dateStr, timeZone) {
  const start = localMidnightUtcMs(dateStr, timeZone);
  const nextStart = localMidnightUtcMs(addDays(dateStr, 1), timeZone);
  return { start: new Date(start), endExclusive: new Date(nextStart) };
}

async function resolveDefaultMatchdayDate(timeZone) {
  const latestFinished = await Match.findOne({
    where: { status: 'finished' },
    order: [['kickoffTime', 'DESC']],
    attributes: ['kickoffTime'],
  });
  if (!latestFinished?.kickoffTime) {
    return formatLocalDate(new Date(), timeZone);
  }
  return formatLocalDate(new Date(latestFinished.kickoffTime), timeZone);
}

function safeInt(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : null;
}

function buildCacheKey({ dateStr, tz, includeAdmins, teamIdNum, limitN }) {
  return JSON.stringify({
    v: 1,
    date: dateStr,
    tz,
    includeAdmins: !!includeAdmins,
    teamId: teamIdNum,
    limit: limitN,
  });
}

async function getCached(cacheKey) {
  const redisReady = await ensureRedis();
  if (!redisReady) return null;
  const raw = await redisGet(`${REDIS_CACHE_PREFIX}${cacheKey}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setCached(cacheKey, value) {
  const redisReady = await ensureRedis();
  if (!redisReady) return;
  await redisSet(`${REDIS_CACHE_PREFIX}${cacheKey}`, JSON.stringify(value), CACHE_TTL_MS);
}

async function fetchMatchIdsForDateRange(dateStr, tz) {
  const { start, endExclusive } = localDateUtcRange(dateStr, tz);
  const matchWhere = { kickoffTime: { [Op.gte]: start, [Op.lt]: endExclusive } };
  const [matchesAll, matchesFinished] = await Promise.all([
    Match.findAll({ where: matchWhere, attributes: ['id', 'status', 'kickoffTime'] }),
    Match.findAll({ where: { ...matchWhere, status: 'finished' }, attributes: ['id'] }),
  ]);
  return {
    matchIds: matchesAll.map((m) => m.id),
    finishedMatchIds: matchesFinished.map((m) => m.id),
  };
}

async function fetchChallengeUsers({ includeAdmins, teamIdNum }) {
  const roleWhere = includeAdmins ? { [Op.in]: ['user', 'admin'] } : 'user';
  return User.findAll({
    where: {
      role: roleWhere,
      ...(teamIdNum ? { teamId: teamIdNum } : {}),
    },
    attributes: ['id', 'firstName', 'lastName', 'imageUrl', 'updatedAt', 'avatarColor', 'avatarEmoji', 'teamId'],
    include: [{ model: Team, as: 'team', attributes: ['id', 'name'] }],
  });
}

async function fetchFinishedPredictions({ finishedMatchIds, userIds }) {
  if (finishedMatchIds.length === 0 || userIds.length === 0) return [];
  return Prediction.findAll({
    where: {
      userId: { [Op.in]: userIds },
      matchId: { [Op.in]: finishedMatchIds },
    },
    attributes: ['userId', 'matchId', 'points', 'predictedHomeScore', 'predictedAwayScore'],
    include: [{
      model: Match,
      as: 'match',
      attributes: ['id', 'homeScore', 'awayScore', 'status'],
      required: true,
    }],
  });
}

function computeStandings({ users, predictions, finishedMatchCount, limitN }) {
  const totals = new Map();
  for (const u of users) {
    totals.set(u.id, {
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      imageUrl: u.imageUrl,
      avatarColor: u.avatarColor || 'default',
      avatarEmoji: u.avatarEmoji || null,
      teamId: u.teamId,
      teamName: u.team ? u.team.name : null,
      totalPoints: 0,
      exactResults: 0,
      submittedPredictions: 0,
    });
  }

  for (const p of predictions) {
    const entry = totals.get(p.userId);
    if (!entry) continue;
    entry.submittedPredictions += 1;
    entry.totalPoints += (p.points ?? 0);
    const match = p.match;
    const isExact = match?.status === 'finished'
      && match.homeScore != null
      && match.awayScore != null
      && p.predictedHomeScore === match.homeScore
      && p.predictedAwayScore === match.awayScore;
    if (isExact) entry.exactResults += 1;
  }

  return Array.from(totals.values())
    .filter((e) => e.submittedPredictions > 0 || finishedMatchCount === 0)
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactResults !== a.exactResults) return b.exactResults - a.exactResults;
      if (b.submittedPredictions !== a.submittedPredictions) return b.submittedPredictions - a.submittedPredictions;
      return String(a.lastName || '').localeCompare(String(b.lastName || ''), 'de');
    })
    .slice(0, limitN)
    .map((e, idx) => ({ rank: idx + 1, ...e }));
}

async function getMatchdayChallenge({
  date,
  timeZone,
  includeAdmins = false,
  teamId = null,
  limit = 10,
} = {}) {
  const tz = timeZone || process.env.FOOTBALL_API_TIMEZONE || 'Europe/Zurich';
  const dateStr = date || await resolveDefaultMatchdayDate(tz);
  const limitN = Math.min(50, Math.max(3, safeInt(limit) || 10));
  const hasTeamId = teamId !== null && teamId !== undefined;
  const teamIdNum = hasTeamId ? safeInt(teamId) : null;

  const cacheKey = buildCacheKey({ dateStr, tz, includeAdmins, teamIdNum, limitN });
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const { matchIds, finishedMatchIds } = await fetchMatchIdsForDateRange(dateStr, tz);

  const users = await fetchChallengeUsers({ includeAdmins, teamIdNum });
  const userIds = users.map((u) => u.id);

  const predictions = await fetchFinishedPredictions({ finishedMatchIds, userIds });
  const finishedMatchCount = finishedMatchIds.length;
  const standings = computeStandings({ users, predictions, finishedMatchCount, limitN });

  const result = {
    date: dateStr,
    timeZone: tz,
    matchCount: matchIds.length,
    finishedMatchCount,
    challenge: {
      type: 'matchday_champion',
      titleKey: 'challenges.matchdayChampion.title',
      subtitleKey: 'challenges.matchdayChampion.subtitle',
    },
    standings,
    winner: standings[0] || null,
  };

  await setCached(cacheKey, result);
  return result;
}

module.exports = { getMatchdayChallenge };

