const { Op } = require('sequelize');
const { User, Team, Prediction, Match, ScoringRule, BonusPrediction, BonusQuestion, LeaderboardSnapshot } = require('../models');
const { calculatePoints, classifyPrediction } = require('./pointsCalculationService');
const { getSetting } = require('./settingsService');

async function getScoringRules() {
  let rules = await ScoringRule.findOne();
  if (!rules) {
    rules = await ScoringRule.create({
      exactResultPoints: 5,
      goalDifferencePoints: 3,
      tendencyPoints: 2,
      wrongPredictionPoints: 0,
    });
  }
  return rules;
}

async function getBonusPoints(userId) {
  const predictions = await BonusPrediction.findAll({
    where: { userId },
    include: [{ model: BonusQuestion, as: 'bonusQuestion' }],
  });

  let total = 0;
  for (const bp of predictions) {
    if (bp.points !== null && bp.points !== undefined) {
      total += bp.points;
    }
  }
  return total;
}

async function buildUserLeaderboardEntry(user, scoringRules, options = {}) {
  const { stageFilter = null, includeEmail = false } = options;

  const predictions = await Prediction.findAll({
    where: { userId: user.id },
    include: [{ model: Match, as: 'match' }],
  });

  let matchPoints = 0;
  let exactResults = 0;
  let goalDifferences = 0;
  let tendencies = 0;
  let relevantPredictions = 0;

  const totalMatches = await Match.count({
    where: stageFilter
      ? stageFilter === 'group'
        ? { stage: { [Op.like]: '%Group%' } }
        : { stage: { [Op.notLike]: '%Group%' } }
      : {},
  });

  for (const prediction of predictions) {
    if (!prediction.match) continue;

    if (stageFilter === 'group' && !prediction.match.stage.includes('Group')) continue;
    if (stageFilter === 'knockout' && prediction.match.stage.includes('Group')) continue;

    relevantPredictions++;

    if (prediction.match.status === 'finished') {
      const points = calculatePoints(prediction, prediction.match, scoringRules);
      if (points !== null) {
        matchPoints += points;
        const classification = classifyPrediction(prediction, prediction.match, scoringRules);
        if (classification === 'exact') exactResults++;
        else if (classification === 'goalDifference') goalDifferences++;
        else if (classification === 'tendency') tendencies++;
      }
    }
  }

  const bonusPoints = await getBonusPoints(user.id);
  const totalPoints = matchPoints + bonusPoints;
  const completionPercentage = totalMatches > 0
    ? Math.round((relevantPredictions / totalMatches) * 100)
    : 0;

  const entry = {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl || null,
    avatarColor: user.avatarColor || 'default',
    avatarEmoji: user.avatarEmoji || null,
    teamId: user.teamId,
    teamName: user.team ? user.team.name : null,
    matchPoints,
    bonusPoints,
    totalPoints,
    exactResults,
    goalDifferences,
    tendencies,
    submittedPredictions: relevantPredictions,
    completionPercentage,
  };

  if (includeEmail) {
    entry.email = user.email;
  }

  return entry;
}

async function getPreviousRanks() {
  const latestSnapshot = await LeaderboardSnapshot.max('snapshotTime');
  if (!latestSnapshot) return {};

  const snapshots = await LeaderboardSnapshot.findAll({
    where: { snapshotTime: latestSnapshot },
  });

  const map = {};
  for (const s of snapshots) {
    map[s.userId] = s.rank;
  }
  return map;
}

async function getLeaderboard(options = {}) {
  const {
    filter = 'overall',
    teamId = null,
    sortBy = 'total',
    includeEmail = false,
    includeAdmins = null,
  } = options;

  const scoringRules = await getScoringRules();
  const stageFilter = filter === 'group' ? 'group' : filter === 'knockout' ? 'knockout' : null;

  const includeAdminsInLeaderboard = includeAdmins != null
    ? includeAdmins
    : await getSetting('includeAdminsInLeaderboard', false);

  const users = await User.findAll({
    where: { role: 'user' },
    include: [{ model: Team, as: 'team' }],
  });

  let allUsers = [...users];

  if (includeAdminsInLeaderboard) {
    const admins = await User.findAll({
      where: { role: 'admin' },
      include: [{ model: Team, as: 'team' }],
    });
    allUsers = [...allUsers, ...admins];
  }

  if (teamId) {
    allUsers = allUsers.filter((u) => u.teamId === parseInt(teamId, 10));
  }

  const entries = await Promise.all(
    allUsers.map((user) => buildUserLeaderboardEntry(user, scoringRules, { stageFilter, includeEmail }))
  );

  if (filter === 'match') {
    entries.forEach((e) => { e.totalPoints = e.matchPoints; });
  } else if (filter === 'bonus') {
    entries.forEach((e) => { e.totalPoints = e.bonusPoints; });
  }

  entries.sort((a, b) => {
    const sortField = sortBy === 'match' ? 'matchPoints' : sortBy === 'bonus' ? 'bonusPoints' : 'totalPoints';
    if (b[sortField] !== a[sortField]) return b[sortField] - a[sortField];
    if (b.exactResults !== a.exactResults) return b.exactResults - a.exactResults;
    if (b.goalDifferences !== a.goalDifferences) return b.goalDifferences - a.goalDifferences;
    if (b.submittedPredictions !== a.submittedPredictions) return b.submittedPredictions - a.submittedPredictions;
    return a.lastName.localeCompare(b.lastName, 'de');
  });

  const previousRanks = await getPreviousRanks();

  return entries.map((entry, index) => {
    const rank = index + 1;
    const previousRank = previousRanks[entry.userId];
    return {
      rank,
      rankMovement: previousRank ? previousRank - rank : 0,
      previousRank: previousRank || null,
      ...entry,
    };
  });
}

async function saveLeaderboardSnapshot() {
  const leaderboard = await getLeaderboard();
  const snapshotTime = new Date();

  await LeaderboardSnapshot.bulkCreate(
    leaderboard.map((entry) => ({
      userId: entry.userId,
      rank: entry.rank,
      totalPoints: entry.totalPoints,
      matchPoints: entry.matchPoints,
      bonusPoints: entry.bonusPoints,
      snapshotTime,
    }))
  );

  return snapshotTime;
}

async function getTeamRanking() {
  const leaderboard = await getLeaderboard();
  const teams = await Team.findAll({ include: [{ model: User, as: 'users' }] });

  const teamEntries = teams.map((team) => {
    const teamUsers = leaderboard.filter((entry) => entry.teamId === team.id);
    const totalPoints = teamUsers.reduce((sum, u) => sum + u.totalPoints, 0);
    const exactResults = teamUsers.reduce((sum, u) => sum + u.exactResults, 0);
    const userCount = teamUsers.length;
    const averagePoints = userCount > 0 ? Math.round((totalPoints / userCount) * 100) / 100 : 0;
    const bestUser = teamUsers.sort((a, b) => b.totalPoints - a.totalPoints)[0];

    const totalPredictions = teamUsers.reduce((sum, u) => sum + u.submittedPredictions, 0);
    const avgCompletion = userCount > 0
      ? Math.round(teamUsers.reduce((sum, u) => sum + u.completionPercentage, 0) / userCount)
      : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      imageUrl: team.imageUrl || null,
      userCount,
      totalPoints,
      averagePoints,
      exactResults,
      bestUser: bestUser ? `${bestUser.firstName} ${bestUser.lastName}` : null,
      completionRate: avgCompletion,
    };
  });

  teamEntries.sort((a, b) => {
    if (b.averagePoints !== a.averagePoints) return b.averagePoints - a.averagePoints;
    return b.totalPoints - a.totalPoints;
  });

  return teamEntries.map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));
}

async function recalculateAllPoints() {
  const { sequelize } = require('../models');
  const scoringRules = await getScoringRules();

  return sequelize.transaction(async (transaction) => {
    const finishedMatches = await Match.findAll({
      where: { status: 'finished' },
      transaction,
    });
    let updated = 0;

    for (const match of finishedMatches) {
      const predictions = await Prediction.findAll({
        where: { matchId: match.id },
        transaction,
      });
      for (const prediction of predictions) {
        const points = calculatePoints(prediction, match, scoringRules);
        await prediction.update({ points }, { transaction });
      }
      updated += predictions.length;
    }

    await recalculateBonusPoints(transaction);
    return { updated, matchesProcessed: finishedMatches.length };
  }).then(async (result) => {
    await saveLeaderboardSnapshot();
    return result;
  });
}

function bonusAnswersMatch(answer, correctAnswer, questionType) {
  if (questionType === 'national_team') {
    const answerId = answer?.id ?? null;
    const correctId = correctAnswer?.id ?? null;
    if (answerId != null && correctId != null && String(answerId) === String(correctId)) {
      return true;
    }
    const answerName = (answer?.name ?? answer)?.toString().trim().toLowerCase();
    const correctName = (correctAnswer?.name ?? correctAnswer)?.toString().trim().toLowerCase();
    return !!(answerName && correctName && answerName === correctName);
  }

  if (questionType === 'national_team_player') {
    const answerId = answer?.id ?? null;
    const correctId = correctAnswer?.id ?? null;
    if (answerId != null && correctId != null && String(answerId) === String(correctId)) {
      return true;
    }
    const answerName = (answer?.name ?? answer)?.toString().trim().toLowerCase();
    const correctName = (correctAnswer?.name ?? correctAnswer)?.toString().trim().toLowerCase();
    return !!(answerName && correctName && answerName === correctName);
  }

  return JSON.stringify(answer) === JSON.stringify(correctAnswer)
    || (Array.isArray(correctAnswer) && correctAnswer.includes(answer))
    || answer === correctAnswer;
}

async function recalculateBonusPoints(transaction = null) {
  const questions = await BonusQuestion.findAll({
    where: { status: 'resolved' },
    transaction,
  });
  let updated = 0;

  for (const question of questions) {
    if (!question.correctAnswerJson) continue;
    const correctAnswer = JSON.parse(question.correctAnswerJson);
    const predictions = await BonusPrediction.findAll({
      where: { bonusQuestionId: question.id },
      transaction,
    });

    for (const pred of predictions) {
      const answer = JSON.parse(pred.answerJson);
      const isCorrect = bonusAnswersMatch(answer, correctAnswer, question.questionType);

      const points = isCorrect ? question.points : 0;
      await pred.update({ points }, { transaction });
      updated++;
    }
  }

  return updated;
}

function exportLeaderboardCsv(leaderboard) {
  const headers = [
    'Rang', 'Vorname', 'Nachname', 'Team', 'Spielpunkte', 'Bonuspunkte',
    'Gesamtpunkte', 'Exakt', 'Tordifferenz', 'Tendenz', 'Tipps', 'Vollständigkeit %',
  ];

  const rows = leaderboard.map((e) => [
    e.rank, e.firstName, e.lastName, e.teamName || '',
    e.matchPoints, e.bonusPoints, e.totalPoints,
    e.exactResults, e.goalDifferences, e.tendencies,
    e.submittedPredictions, e.completionPercentage,
  ]);

  const BOM = '\uFEFF';
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(';')).join('\n');
  return BOM + csv;
}

module.exports = {
  getLeaderboard,
  getTeamRanking,
  recalculateAllPoints,
  recalculateBonusPoints,
  getScoringRules,
  buildUserLeaderboardEntry,
  saveLeaderboardSnapshot,
  exportLeaderboardCsv,
  getBonusPoints,
};
