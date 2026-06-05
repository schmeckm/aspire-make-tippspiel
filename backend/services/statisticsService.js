const { Op } = require('sequelize');
const {
  User, Team, Match, Prediction, BonusPrediction, BonusQuestion, LeaderboardSnapshot,
} = require('../models');
const { buildUserLeaderboardEntry, getScoringRules, getTeamRanking } = require('./leaderboardService');
const { calculatePoints, classifyPrediction } = require('./pointsCalculationService');
const { listPlayers } = require('./footballTeamService');

function mapUserFavoriteEntry(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    departmentTeam: user.team?.name || null,
  };
}

function aggregateFavoritePicks(users, getKey, getInitialEntry) {
  const map = new Map();

  for (const user of users) {
    const key = getKey(user);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, { ...getInitialEntry(user), pickCount: 0, users: [] });
    }

    const entry = map.get(key);
    entry.pickCount += 1;
    entry.users.push(mapUserFavoriteEntry(user));
  }

  return map;
}

async function getUserStatistics(userId) {
  const user = await User.findByPk(userId, { include: [{ model: Team, as: 'team' }] });
  if (!user) return null;

  const scoringRules = await getScoringRules();
  const entry = await buildUserLeaderboardEntry(user, scoringRules);
  const leaderboard = await require('./leaderboardService').getLeaderboard();
  const rankEntry = leaderboard.find((e) => e.userId === userId);

  const snapshots = await LeaderboardSnapshot.findAll({
    where: { userId },
    order: [['snapshotTime', 'ASC']],
  });

  const ranks = snapshots.map((s) => s.rank);
  const pointsOverTime = snapshots.map((s) => ({
    time: s.snapshotTime,
    totalPoints: s.totalPoints,
    matchPoints: s.matchPoints,
    bonusPoints: s.bonusPoints,
  }));

  const predictions = await Prediction.findAll({
    where: { userId },
    include: [{ model: Match, as: 'match' }],
  });

  const finishedPredictions = predictions.filter((p) => p.match?.status === 'finished');
  const exactCount = finishedPredictions.filter((p) =>
    classifyPrediction(p, p.match, scoringRules) === 'exact'
  ).length;

  const exactRate = finishedPredictions.length > 0
    ? Math.round((exactCount / finishedPredictions.length) * 100)
    : 0;

  const avgPoints = finishedPredictions.length > 0
    ? Math.round((entry.matchPoints / finishedPredictions.length) * 100) / 100
    : 0;

  const pointsByStage = {};
  for (const p of finishedPredictions) {
    const stage = p.match.stage;
    const pts = calculatePoints(p, p.match, scoringRules) || 0;
    pointsByStage[stage] = (pointsByStage[stage] || 0) + pts;
  }

  const openMatches = await Match.count({
    where: { status: 'scheduled', kickoffTime: { [Op.gt]: new Date() } },
  });
  const submittedMatchIds = new Set(predictions.map((p) => p.matchId));
  const missingPredictions = openMatches - predictions.filter((p) => {
    return p.match && p.match.status === 'scheduled' && new Date(p.match.kickoffTime) > new Date();
  }).length;

  const bonusPredictions = await BonusPrediction.findAll({
    where: { userId },
    include: [{ model: BonusQuestion, as: 'bonusQuestion' }],
  });

  const accuracyByStage = {};
  for (const p of finishedPredictions) {
    const stage = p.match.stage.includes('Group') ? 'Gruppenphase' : 'K.o.-Phase';
    if (!accuracyByStage[stage]) accuracyByStage[stage] = { total: 0, exact: 0, points: 0 };
    accuracyByStage[stage].total++;
    const cls = classifyPrediction(p, p.match, scoringRules);
    if (cls === 'exact') accuracyByStage[stage].exact++;
    accuracyByStage[stage].points += calculatePoints(p, p.match, scoringRules) || 0;
  }

  return {
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, team: user.team?.name },
    totalPoints: entry.totalPoints,
    matchPoints: entry.matchPoints,
    bonusPoints: entry.bonusPoints,
    currentRank: rankEntry?.rank || null,
    bestRank: ranks.length ? Math.min(...ranks) : rankEntry?.rank,
    worstRank: ranks.length ? Math.max(...ranks) : rankEntry?.rank,
    exactPredictionRate: exactRate,
    averagePointsPerMatch: avgPoints,
    pointsByStage,
    accuracyByStage,
    missingPredictions: Math.max(0, missingPredictions),
    completionPercentage: entry.completionPercentage,
    submittedPredictions: entry.submittedPredictions,
    bonusAnswered: bonusPredictions.length,
    pointsOverTime,
    rankOverTime: snapshots.map((s) => ({ time: s.snapshotTime, rank: s.rank })),
  };
}

async function getTeamStatistics(teamId) {
  const team = await Team.findByPk(teamId, { include: [{ model: User, as: 'users' }] });
  if (!team) return null;

  const teamRanking = await getTeamRanking();
  const teamEntry = teamRanking.find((t) => t.teamId === team.id);

  const userStats = [];
  for (const user of team.users) {
    const stats = await getUserStatistics(user.id);
    userStats.push(stats);
  }

  const snapshots = await LeaderboardSnapshot.findAll({
    where: { userId: team.users.map((u) => u.id) },
    order: [['snapshotTime', 'ASC']],
  });

  const trendMap = {};
  for (const s of snapshots) {
    const key = s.snapshotTime.toISOString().slice(0, 13);
    if (!trendMap[key]) trendMap[key] = { time: s.snapshotTime, totalPoints: 0, count: 0 };
    trendMap[key].totalPoints += s.totalPoints;
    trendMap[key].count++;
  }

  const trend = Object.values(trendMap).map((t) => ({
    time: t.time,
    averagePoints: Math.round((t.totalPoints / t.count) * 100) / 100,
  }));

  return {
    team: { id: team.id, name: team.name },
    ranking: teamEntry,
    users: userStats,
    trend,
  };
}

async function getAdminOverview() {
  const { sequelize } = require('../models');
  const totalUsers = await User.count({ where: { role: 'user' } });

  const [activeResult] = await sequelize.query(
    'SELECT COUNT(DISTINCT userId) as count FROM Predictions',
    { type: sequelize.QueryTypes.SELECT }
  ).catch(() => [{ count: 0 }]);

  const activeUsers = activeResult?.count || 0;

  const openMatches = await Match.count({ where: { status: 'scheduled' } });
  const totalPredictions = await Prediction.count();
  const expectedPredictions = totalUsers * openMatches;
  const missingToday = Math.max(0, expectedPredictions - totalPredictions);

  const completionRate = expectedPredictions > 0
    ? Math.round((totalPredictions / (totalPredictions + missingToday)) * 100)
    : 0;

  return {
    totalUsers,
    activeUsers,
    completionRate,
    missingPredictionsToday: missingToday,
    totalPredictions,
    openMatches,
  };
}

async function getUserFavoritesOverview() {
  const users = await User.findAll({
    include: [{ model: Team, as: 'team' }],
    order: [['lastName', 'ASC'], ['firstName', 'ASC']],
  });

  const usersWithTopScorer = users.filter(
    (user) => user.topScorerPlayerId || user.topScorerPlayerName,
  );
  const usersWithFavoriteTeam = users.filter(
    (user) => user.favoriteNationalTeamId || user.favoriteNationalTeamName,
  );

  const topScorerMap = aggregateFavoritePicks(
    users,
    (user) => {
      if (user.topScorerPlayerId) return `id:${user.topScorerPlayerId}`;
      if (user.topScorerPlayerName) {
        return `name:${user.topScorerPlayerName.toLowerCase().trim()}`;
      }
      return null;
    },
    (user) => ({
      playerId: user.topScorerPlayerId || null,
      playerName: user.topScorerPlayerName || null,
      teamName: null,
      teamId: null,
      imageUrl: null,
      imageSource: null,
    }),
  );

  const favoriteTeamMap = aggregateFavoritePicks(
    users,
    (user) => {
      if (user.favoriteNationalTeamId) return `id:${user.favoriteNationalTeamId}`;
      if (user.favoriteNationalTeamName) {
        return `name:${user.favoriteNationalTeamName.toLowerCase().trim()}`;
      }
      return null;
    },
    (user) => ({
      teamId: user.favoriteNationalTeamId || null,
      teamName: user.favoriteNationalTeamName || null,
    }),
  );

  try {
    const players = await listPlayers();
    const playersById = new Map(players.map((player) => [player.id, player]));

    for (const entry of topScorerMap.values()) {
      if (!entry.playerId || !playersById.has(entry.playerId)) continue;
      const player = playersById.get(entry.playerId);
      entry.playerName = entry.playerName || player.name;
      entry.teamName = player.teamName || null;
      entry.teamId = player.teamId || null;
      entry.imageUrl = player.imageUrl || null;
      entry.imageSource = player.imageSource || null;
    }
  } catch {
    // Football API optional – overview still works with stored names
  }

  const topScorerBase = usersWithTopScorer.length || 1;
  const topScorerPicks = [...topScorerMap.values()]
    .map((entry) => ({
      ...entry,
      percentage: Math.round((entry.pickCount / topScorerBase) * 100),
    }))
    .sort((a, b) => (
      b.pickCount - a.pickCount
      || String(a.playerName || '').localeCompare(String(b.playerName || ''))
    ));

  const favoriteTeamBase = usersWithFavoriteTeam.length || 1;
  const favoriteTeams = [...favoriteTeamMap.values()]
    .map((entry) => ({
      ...entry,
      percentage: Math.round((entry.pickCount / favoriteTeamBase) * 100),
    }))
    .sort((a, b) => (
      b.pickCount - a.pickCount
      || String(a.teamName || '').localeCompare(String(b.teamName || ''))
    ));

  const usersWithoutTopScorer = users
    .filter((user) => !user.topScorerPlayerId && !user.topScorerPlayerName)
    .map(mapUserFavoriteEntry);

  const usersWithoutFavoriteTeam = users
    .filter((user) => !user.favoriteNationalTeamId && !user.favoriteNationalTeamName)
    .map(mapUserFavoriteEntry);

  return {
    summary: {
      totalUsers: users.length,
      withTopScorerPick: usersWithTopScorer.length,
      withFavoriteTeam: usersWithFavoriteTeam.length,
      withoutTopScorerPick: usersWithoutTopScorer.length,
      withoutFavoriteTeam: usersWithoutFavoriteTeam.length,
      uniqueTopScorerPicks: topScorerPicks.length,
      uniqueFavoriteTeams: favoriteTeams.length,
      mostPopularPlayer: topScorerPicks[0]?.playerName || null,
      mostPopularTeam: favoriteTeams[0]?.teamName || null,
    },
    topScorerPicks,
    favoriteTeams,
    usersWithoutTopScorer,
    usersWithoutFavoriteTeam,
  };
}

module.exports = {
  getUserStatistics,
  getTeamStatistics,
  getAdminOverview,
  getUserFavoritesOverview,
};
