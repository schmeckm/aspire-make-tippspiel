const { Op } = require('sequelize');
const { Prediction, Match, ScoringRule } = require('../models');
const { calculatePoints } = require('./pointsCalculationService');

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

function isCorrectTendency(points, rules) {
  if (points === null || points === undefined) return false;
  return Number(points) >= Number(rules.tendencyPoints || 2);
}

function buildAchievements({ bestStreak }) {
  const n = Number(bestStreak || 0);
  return [
    { key: 'streak_bronze_3', threshold: 3, unlocked: n >= 3, titleKey: 'achievements.streakBronze.title', descriptionKey: 'achievements.streakBronze.description' },
    { key: 'streak_silver_5', threshold: 5, unlocked: n >= 5, titleKey: 'achievements.streakSilver.title', descriptionKey: 'achievements.streakSilver.description' },
    { key: 'streak_gold_10', threshold: 10, unlocked: n >= 10, titleKey: 'achievements.streakGold.title', descriptionKey: 'achievements.streakGold.description' },
  ].map((a) => ({
    ...a,
    progress: Math.min(1, (n / a.threshold)),
  }));
}

function computeBestStreakFromChronological(matchesChrono, predictionByMatchId, rules) {
  let best = 0;
  let current = 0;
  for (const match of matchesChrono) {
    const prediction = predictionByMatchId.get(match.id);
    if (!prediction) {
      current = 0;
      continue;
    }
    const points = prediction.points ?? calculatePoints(prediction, match, rules);
    if (isCorrectTendency(points, rules)) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

async function getUserStreakSummary(userId, options = {}) {
  const { stageFilter = null, limit = 300 } = options;
  const rules = await getScoringRules();

  const matchWhere = {
    status: 'finished',
    ...(stageFilter === 'group' ? { stage: { [Op.like]: '%Group%' } } : {}),
    ...(stageFilter === 'knockout' ? { stage: { [Op.notLike]: '%Group%' } } : {}),
  };

  const matches = await Match.findAll({
    where: matchWhere,
    order: [['kickoffTime', 'DESC']],
    limit: Math.min(800, Math.max(50, Number(limit) || 300)),
    attributes: ['id', 'kickoffTime', 'stage', 'homeScore', 'awayScore', 'status'],
  });

  const matchIds = matches.map((m) => m.id);

  const predictions = matchIds.length > 0
    ? await Prediction.findAll({
      where: {
        userId,
        matchId: { [Op.in]: matchIds },
      },
      attributes: ['matchId', 'predictedHomeScore', 'predictedAwayScore', 'points', 'submittedAt'],
    })
    : [];

  const predictionByMatchId = new Map();
  for (const p of predictions) predictionByMatchId.set(p.matchId, p);

  // Current streak: walk from newest finished match backwards.
  let current = 0;
  let currentSinceKickoffTime = null;
  for (const match of matches) {
    const prediction = predictionByMatchId.get(match.id);
    if (!prediction) break;
    const points = prediction.points ?? calculatePoints(prediction, match, rules);
    if (!isCorrectTendency(points, rules)) break;
    current += 1;
    currentSinceKickoffTime = match.kickoffTime;
  }

  // Best streak: scan chronological (oldest → newest).
  const matchesChrono = [...matches].reverse();
  const best = computeBestStreakFromChronological(matchesChrono, predictionByMatchId, rules);

  return {
    metric: 'correct_tendency',
    current: {
      count: current,
      sinceKickoffTime: currentSinceKickoffTime,
    },
    best: {
      count: best,
    },
    achievements: buildAchievements({ bestStreak: best }),
  };
}

module.exports = { getUserStreakSummary };

