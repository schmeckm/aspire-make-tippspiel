const { Op } = require('sequelize');
const { LeaderboardSnapshot, User, Team } = require('../models');
const { getMatchdayChallenge } = require('./matchdayChallengeService');

function safeInt(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : null;
}

function buildUserDto(user) {
  return {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl || null,
    avatarColor: user.avatarColor || 'default',
    avatarEmoji: user.avatarEmoji || null,
    teamId: user.teamId || null,
    teamName: user.team?.name || null,
  };
}

async function getSnapshotTimes() {
  const latest = await LeaderboardSnapshot.max('snapshotTime');
  if (!latest) return { latest: null, previous: null };
  const previous = await LeaderboardSnapshot.max('snapshotTime', {
    where: { snapshotTime: { [Op.lt]: latest } },
  });
  return { latest, previous: previous || null };
}

async function buildRankMovementEvents({ teamId = null, limit = 10 } = {}) {
  const { latest, previous } = await getSnapshotTimes();
  if (!latest || !previous) return [];

  const userWhere = {
    role: { [Op.in]: ['user', 'admin'] },
    ...(teamId ? { teamId } : {}),
  };

  const users = await User.findAll({
    where: userWhere,
    attributes: ['id', 'firstName', 'lastName', 'imageUrl', 'avatarColor', 'avatarEmoji', 'teamId'],
    include: [{ model: Team, as: 'team', attributes: ['id', 'name'] }],
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return [];

  const [latestRows, prevRows] = await Promise.all([
    LeaderboardSnapshot.findAll({
      where: { snapshotTime: latest, userId: { [Op.in]: userIds } },
      attributes: ['userId', 'rank', 'totalPoints', 'matchPoints', 'bonusPoints'],
      raw: true,
    }),
    LeaderboardSnapshot.findAll({
      where: { snapshotTime: previous, userId: { [Op.in]: userIds } },
      attributes: ['userId', 'rank', 'totalPoints', 'matchPoints', 'bonusPoints'],
      raw: true,
    }),
  ]);

  const prevByUser = new Map(prevRows.map((r) => [r.userId, r]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const events = [];
  for (const cur of latestRows) {
    const prev = prevByUser.get(cur.userId);
    const user = userById.get(cur.userId);
    if (!prev || !user) continue;

    const movement = prev.rank - cur.rank; // + => moved up
    if (movement === 0) continue;

    events.push({
      id: `rank-move:${String(latest)}:${cur.userId}`,
      type: 'rank_movement',
      createdAt: latest,
      scope: teamId ? 'team' : 'global',
      actor: buildUserDto(user),
      data: {
        movement,
        previousRank: prev.rank,
        currentRank: cur.rank,
        previousPoints: prev.totalPoints,
        currentPoints: cur.totalPoints,
        pointsDelta: (cur.totalPoints ?? 0) - (prev.totalPoints ?? 0),
      },
    });
  }

  // Sort by absolute movement (bigger changes first), then by time (same), then by pointsDelta.
  events.sort((a, b) => {
    const am = Math.abs(a.data.movement);
    const bm = Math.abs(b.data.movement);
    if (bm !== am) return bm - am;
    const ap = a.data.pointsDelta;
    const bp = b.data.pointsDelta;
    if (bp !== ap) return bp - ap;
    return String(a.actor.lastName || '').localeCompare(String(b.actor.lastName || ''), 'de');
  });

  return events.slice(0, Math.min(25, Math.max(1, safeInt(limit) || 10)));
}

async function buildMatchdayChallengeEvent({ teamId = null } = {}) {
  const challenge = await getMatchdayChallenge({
    teamId: teamId || null,
    includeAdmins: true,
    limit: 10,
  });

  if (!challenge?.winner || !challenge?.finishedMatchCount) return null;

  // Winner entry already contains the minimal leaderboard-style fields.
  return {
    id: `matchday-challenge:${challenge.date}:${teamId || 'global'}`,
    type: 'matchday_champion',
    createdAt: new Date(`${challenge.date}T23:59:59.000Z`).toISOString(),
    scope: teamId ? 'team' : 'global',
    actor: {
      userId: challenge.winner.userId,
      firstName: challenge.winner.firstName,
      lastName: challenge.winner.lastName,
      imageUrl: challenge.winner.imageUrl || null,
      avatarColor: challenge.winner.avatarColor || 'default',
      avatarEmoji: challenge.winner.avatarEmoji || null,
      teamId: challenge.winner.teamId || null,
      teamName: challenge.winner.teamName || null,
    },
    data: {
      date: challenge.date,
      finishedMatchCount: challenge.finishedMatchCount,
      points: challenge.winner.totalPoints,
      exactResults: challenge.winner.exactResults || 0,
    },
  };
}

async function getActivityFeed({ viewerUser, scope = 'team', limit = 20 } = {}) {
  const scopeKey = scope === 'global' ? 'global' : 'team';
  const teamId = scopeKey === 'team' ? viewerUser?.teamId : null;

  const [challengeEvent, rankEvents] = await Promise.all([
    buildMatchdayChallengeEvent({ teamId }),
    buildRankMovementEvents({ teamId, limit: 12 }),
  ]);

  const items = [];
  if (challengeEvent) items.push(challengeEvent);
  items.push(...rankEvents);

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const lim = Math.min(50, Math.max(5, safeInt(limit) || 20));

  return {
    scope: scopeKey,
    teamId: teamId || null,
    items: items.slice(0, lim),
  };
}

module.exports = { getActivityFeed };

