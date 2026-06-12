const { Op } = require('sequelize');
const { Prediction, Match, ScoringRule } = require('../models');
const { calculatePoints, classifyPrediction } = require('./pointsCalculationService');
const { getLeaderboard } = require('./leaderboardService');

async function getScoringRules() {
  let rules = await ScoringRule.findOne();
  if (!rules) {
    rules = await ScoringRule.create({
      exactResultPoints: 4,
      goalDifferencePoints: 3,
      tendencyPoints: 2,
      wrongPredictionPoints: 0,
    });
  }
  return rules;
}

function toInt(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : null;
}

function classificationDelta(oldClass, nextClass) {
  const delta = { exactResults: 0, goalDifferences: 0, tendencies: 0 };
  const map = {
    exact: 'exactResults',
    goalDifference: 'goalDifferences',
    tendency: 'tendencies',
  };
  if (oldClass && map[oldClass]) delta[map[oldClass]] -= 1;
  if (nextClass && map[nextClass]) delta[map[nextClass]] += 1;
  return delta;
}

function sortLikeLeaderboard(entries, sortBy = 'total') {
  let sortField = 'totalPoints';
  if (sortBy === 'match') sortField = 'matchPoints';
  else if (sortBy === 'bonus') sortField = 'bonusPoints';

  return [...entries].sort((a, b) => {
    if (b[sortField] !== a[sortField]) return b[sortField] - a[sortField];
    if (b.exactResults !== a.exactResults) return b.exactResults - a.exactResults;
    if (b.goalDifferences !== a.goalDifferences) return b.goalDifferences - a.goalDifferences;
    if (b.submittedPredictions !== a.submittedPredictions) return b.submittedPredictions - a.submittedPredictions;
    return String(a.lastName || '').localeCompare(String(b.lastName || ''), 'de');
  });
}

async function simulateMatchWhatIf({
  userId,
  matchId,
  predictedHomeScore,
  predictedAwayScore,
} = {}) {
  const matchIdNum = toInt(matchId);
  const home = toInt(predictedHomeScore);
  const away = toInt(predictedAwayScore);
  if (!matchIdNum || home === null || away === null || home < 0 || away < 0) {
    const err = new Error('INVALID_INPUT');
    err.status = 400;
    err.errorKey = 'errors.requiredFields';
    throw err;
  }

  const match = await Match.findByPk(matchIdNum);
  if (!match) {
    const err = new Error('MATCH_NOT_FOUND');
    err.status = 404;
    err.errorKey = 'errors.matchNotFound';
    throw err;
  }
  if (match.status !== 'finished' || match.homeScore === null || match.awayScore === null) {
    const err = new Error('MATCH_NOT_FINISHED');
    err.status = 400;
    err.errorKey = 'errors.matchNotFinished';
    throw err;
  }

  const rules = await getScoringRules();

  const existing = await Prediction.findOne({
    where: { userId, matchId: match.id },
    attributes: ['matchId', 'predictedHomeScore', 'predictedAwayScore', 'points'],
  });

  const oldPrediction = existing
    ? { predictedHomeScore: existing.predictedHomeScore, predictedAwayScore: existing.predictedAwayScore }
    : null;

  const newPrediction = { predictedHomeScore: home, predictedAwayScore: away };

  const oldPoints = existing ? (existing.points ?? calculatePoints(oldPrediction, match, rules) ?? 0) : 0;
  const newPoints = calculatePoints(newPrediction, match, rules) ?? 0;
  const deltaPoints = newPoints - oldPoints;

  const oldClass = existing ? classifyPrediction(oldPrediction, match, rules) : null;
  const nextClass = classifyPrediction(newPrediction, match, rules);
  const classDelta = existing ? classificationDelta(oldClass, nextClass) : classificationDelta(null, nextClass);

  const leaderboard = await getLeaderboard({
    filter: 'overall',
    sortBy: 'total',
    includeEmail: false,
  });

  const me = leaderboard.find((e) => e.userId === userId);
  if (!me) {
    const err = new Error('USER_NOT_IN_LEADERBOARD');
    err.status = 404;
    err.errorKey = 'errors.userNotFound';
    throw err;
  }

  const simulatedMe = {
    ...me,
    matchPoints: (me.matchPoints ?? 0) + deltaPoints,
    totalPoints: (me.totalPoints ?? 0) + deltaPoints,
    exactResults: (me.exactResults ?? 0) + classDelta.exactResults,
    goalDifferences: (me.goalDifferences ?? 0) + classDelta.goalDifferences,
    tendencies: (me.tendencies ?? 0) + classDelta.tendencies,
  };

  // If the user had no stored prediction, treat it as a hypothetical "submitted" one for the projection.
  if (!existing) {
    simulatedMe.submittedPredictions = (me.submittedPredictions ?? 0) + 1;
  }

  const merged = leaderboard.map((e) => (e.userId === userId ? simulatedMe : e));
  const sorted = sortLikeLeaderboard(merged, 'total');

  const projectedRank = sorted.findIndex((e) => e.userId === userId) + 1;
  const currentRank = me.rank ?? (leaderboard.findIndex((e) => e.userId === userId) + 1);

  const top10 = sorted.slice(0, 10).map((e) => ({
    rank: e.rank ?? null,
    userId: e.userId,
    firstName: e.firstName,
    lastName: e.lastName,
    teamName: e.teamName || null,
    totalPoints: e.totalPoints,
  }));

  const top10WithGaps = top10.map((e) => ({
    ...e,
    gapAfter: e.totalPoints - simulatedMe.totalPoints,
    gapBefore: e.totalPoints - me.totalPoints,
  }));

  return {
    match: {
      id: match.id,
      matchNumber: match.matchNumber,
      stage: match.stage,
      kickoffTime: match.kickoffTime,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
    },
    current: {
      rank: currentRank,
      totalPoints: me.totalPoints,
      matchPoints: me.matchPoints,
      prediction: existing
        ? { predictedHomeScore: existing.predictedHomeScore, predictedAwayScore: existing.predictedAwayScore, points: oldPoints }
        : null,
    },
    simulated: {
      rank: projectedRank,
      totalPoints: simulatedMe.totalPoints,
      matchPoints: simulatedMe.matchPoints,
      prediction: { predictedHomeScore: home, predictedAwayScore: away, points: newPoints },
      deltaPoints,
    },
    top10: top10WithGaps,
  };
}

module.exports = { simulateMatchWhatIf };

