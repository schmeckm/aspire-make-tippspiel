const { Op } = require('sequelize');
const { Prediction, Match } = require('../models');
const { teamsMatch } = require('../data/wm2026ScheduleLookup');

function isStrictPredictionProtectionEnabled() {
  return process.env.PREDICTION_PROTECT_STRICT !== 'false';
}

async function countPredictionsForMatch(matchId) {
  return Prediction.count({ where: { matchId } });
}

async function assertMatchHasNoPredictions(matchId, context = 'operation') {
  const count = await countPredictionsForMatch(matchId);
  if (count > 0) {
    const err = new Error(`Match ${matchId} has ${count} prediction(s); blocked (${context}).`);
    err.code = 'PREDICTIONS_PROTECTED';
    err.predictionCount = count;
    throw err;
  }
}

async function safeDestroyMatch(match, { context = 'match_delete', force = false } = {}) {
  const predictionCount = await countPredictionsForMatch(match.id);
  const strict = isStrictPredictionProtectionEnabled();

  if (predictionCount > 0 && strict && !force) {
    return {
      destroyed: false,
      skipped: true,
      predictionCount,
      reason: 'has_predictions',
      context,
    };
  }

  await match.destroy();
  return {
    destroyed: true,
    skipped: false,
    predictionCount,
    context,
  };
}

async function findManualMatchForFixture(fixture) {
  if (!fixture?.homeTeam || !fixture?.awayTeam) return null;

  const manualMatches = await Match.findAll({
    where: {
      [Op.or]: [
        { externalApiId: null },
        { externalApiId: '' },
      ],
    },
  });

  return manualMatches.find(
    (match) => teamsMatch(match.homeTeam, fixture.homeTeam)
      && teamsMatch(match.awayTeam, fixture.awayTeam),
  ) || null;
}

module.exports = {
  isStrictPredictionProtectionEnabled,
  countPredictionsForMatch,
  assertMatchHasNoPredictions,
  safeDestroyMatch,
  findManualMatchForFixture,
};
