const { Op } = require('sequelize');
const {
  User, Team, Match, Prediction, ScoringRule, BonusQuestion, BonusPrediction, SyncLog,
} = require('../models');
const { getLeaderboard, getTeamRanking, getScoringRules } = require('./leaderboardService');

async function buildMatchContext(matchId, userId = null) {
  const match = await Match.findByPk(matchId);
  if (!match) return null;

  const ctx = {
    match: {
      id: match.id,
      matchNumber: match.matchNumber,
      stage: match.stage,
      groupName: match.groupName,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoffTime: match.kickoffTime,
      stadium: match.stadium,
      city: match.city,
      status: match.status,
      homeScore: match.status === 'finished' ? match.homeScore : null,
      awayScore: match.status === 'finished' ? match.awayScore : null,
    },
  };

  if (userId && match.status === 'finished') {
    const ownPrediction = await Prediction.findOne({ where: { userId, matchId } });
    if (ownPrediction) {
      ctx.ownPrediction = {
        predictedHomeScore: ownPrediction.predictedHomeScore,
        predictedAwayScore: ownPrediction.predictedAwayScore,
        points: ownPrediction.points,
      };
    }
  }

  return ctx;
}

async function buildUserContext(userId) {
  const user = await User.findByPk(userId, { include: [{ model: Team, as: 'team' }] });
  if (!user) return null;

  const scoringRules = await getScoringRules();
  const leaderboard = await getLeaderboard();
  const entry = leaderboard.find((e) => e.userId === userId);

  const predictions = await Prediction.findAll({
    where: { userId },
    include: [{ model: Match, as: 'match' }],
  });

  const openMatches = await Match.findAll({
    where: { status: 'scheduled', kickoffTime: { [Op.gt]: new Date() }, isManuallyLocked: false },
    order: [['kickoffTime', 'ASC']],
    limit: 20,
  });

  const upcomingSchedule = await Match.findAll({
    where: {
      status: { [Op.in]: ['scheduled', 'live'] },
      kickoffTime: { [Op.gt]: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    },
    order: [['kickoffTime', 'ASC']],
    limit: 40,
  });

  const mapMatch = (m) => ({
    id: m.id,
    matchNumber: m.matchNumber,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    kickoffTime: m.kickoffTime,
    stage: m.stage,
    groupName: m.groupName,
    status: m.status,
  });

  const predictedMatchIds = new Set(predictions.map((p) => p.matchId));
  const missingMatches = openMatches.filter((m) => !predictedMatchIds.has(m.id));

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayMatches = openMatches.filter((m) => new Date(m.kickoffTime) <= todayEnd);
  const missingToday = todayMatches.filter((m) => !predictedMatchIds.has(m.id));

  const teamRanking = await getTeamRanking();
  const userTeamRank = user.teamId
    ? teamRanking.find((t) => t.teamId === user.teamId)
    : null;

  return {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    teamName: user.team?.name || null,
    rank: entry?.rank || null,
    totalPoints: entry?.totalPoints || 0,
    matchPoints: entry?.matchPoints || 0,
    bonusPoints: entry?.bonusPoints || 0,
    exactResults: entry?.exactResults || 0,
    submittedPredictions: entry?.submittedPredictions || 0,
    completionPercentage: entry?.completionPercentage || 0,
    missingPredictionsCount: missingMatches.length,
    missingTodayCount: missingToday.length,
    missingMatches: missingMatches.slice(0, 10).map(mapMatch),
    upcomingMatches: openMatches.slice(0, 5).map(mapMatch),
    upcomingSchedule: upcomingSchedule.map(mapMatch),
    userPredictions: predictions
      .filter((p) => p.match)
      .slice(0, 25)
      .map((p) => ({
        matchNumber: p.match.matchNumber,
        homeTeam: p.match.homeTeam,
        awayTeam: p.match.awayTeam,
        kickoffTime: p.match.kickoffTime,
        status: p.match.status,
        predictedHomeScore: p.predictedHomeScore,
        predictedAwayScore: p.predictedAwayScore,
        points: p.points,
      })),
    teamsInSchedule: [...new Set(
      upcomingSchedule.flatMap((m) => [m.homeTeam, m.awayTeam]),
    )].sort(),
    teamRanking: userTeamRank ? { rank: userTeamRank.rank, averagePoints: userTeamRank.averagePoints } : null,
    scoringRules: {
      exact: scoringRules.exactResultPoints,
      goalDifference: scoringRules.goalDifferencePoints,
      tendency: scoringRules.tendencyPoints,
    },
    finishedPredictionsCount: predictions.filter((p) => p.match?.status === 'finished').length,
  };
}

async function buildLeaderboardContext(userId = null) {
  const leaderboard = await getLeaderboard();
  const teamRanking = await getTeamRanking();

  const top10 = leaderboard.slice(0, 10).map((e) => ({
    rank: e.rank, name: `${e.firstName} ${e.lastName}`,
    team: e.teamName, totalPoints: e.totalPoints,
    matchPoints: e.matchPoints, bonusPoints: e.bonusPoints,
    exactResults: e.exactResults, rankMovement: e.rankMovement,
  }));

  const finishedMatches = await Match.findAll({
    where: { status: 'finished' },
    order: [['updatedAt', 'DESC']],
    limit: 5,
  });

  const ctx = {
    top10,
    teamRankingTop5: teamRanking.slice(0, 5).map((t) => ({
      rank: t.rank, teamName: t.teamName, averagePoints: t.averagePoints, totalPoints: t.totalPoints,
    })),
    lastFinishedMatches: finishedMatches.map((m) => ({
      homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      score: `${m.homeScore}:${m.awayScore}`, stage: m.stage,
    })),
    biggestMovers: leaderboard.filter((e) => e.rankMovement !== 0)
      .sort((a, b) => b.rankMovement - a.rankMovement).slice(0, 3)
      .map((e) => ({ name: `${e.firstName} ${e.lastName}`, movement: e.rankMovement })),
  };

  if (userId) {
    const userEntry = leaderboard.find((e) => e.userId === userId);
    if (userEntry) {
      ctx.currentUser = {
        rank: userEntry.rank, totalPoints: userEntry.totalPoints,
        rankMovement: userEntry.rankMovement, exactResults: userEntry.exactResults,
      };
    }
  }

  return ctx;
}

async function buildTeamRankingContext() {
  const ranking = await getTeamRanking();
  return { teams: ranking.slice(0, 10) };
}

async function buildMissingPredictionsContext(userId) {
  const userCtx = await buildUserContext(userId);
  if (!userCtx) return null;
  return {
    userId,
    missingCount: userCtx.missingPredictionsCount,
    missingTodayCount: userCtx.missingTodayCount,
    missingMatches: userCtx.missingMatches,
  };
}

async function buildAdminContext() {
  const totalUsers = await User.count({ where: { role: 'user' } });
  const totalMatches = await Match.count();
  const finishedMatches = await Match.count({ where: { status: 'finished' } });
  const openMatches = await Match.count({ where: { status: 'scheduled' } });
  const matchesWithoutResult = await Match.count({
    where: { status: { [Op.in]: ['scheduled', 'live', 'locked'] }, kickoffTime: { [Op.lt]: new Date() } },
  });
  const totalPredictions = await Prediction.count();
  const leaderboard = await getLeaderboard();

  const lastSyncError = await SyncLog.findOne({
    where: { status: 'failed' },
    order: [['startedAt', 'DESC']],
  });

  const bonusQuestions = await BonusQuestion.findAll({ limit: 10 });

  return {
    stats: { totalUsers, totalMatches, finishedMatches, openMatches, matchesWithoutResult, totalPredictions },
    leaderboardEmpty: leaderboard.length === 0,
    top3: leaderboard.slice(0, 3).map((e) => ({ rank: e.rank, name: `${e.firstName} ${e.lastName}`, points: e.totalPoints })),
    lastSyncError: lastSyncError ? { message: lastSyncError.errorMessage, type: lastSyncError.syncType, at: lastSyncError.startedAt } : null,
    bonusQuestionsCount: bonusQuestions.length,
    openBonusQuestions: bonusQuestions.filter((q) => q.status === 'open').length,
  };
}

async function buildBonusQuestionContext() {
  const existing = await BonusQuestion.findAll({ order: [['createdAt', 'DESC']], limit: 10 });
  return {
    existingQuestions: existing.map((q) => ({ questionText: q.questionText, status: q.status, points: q.points })),
    tournament: 'FIFA WM 2026',
  };
}

module.exports = {
  buildMatchContext,
  buildUserContext,
  buildLeaderboardContext,
  buildTeamRankingContext,
  buildMissingPredictionsContext,
  buildAdminContext,
  buildBonusQuestionContext,
};
