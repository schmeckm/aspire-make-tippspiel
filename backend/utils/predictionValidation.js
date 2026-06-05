const MAX_SCORE = parseInt(process.env.PREDICTION_MAX_SCORE || '20', 10);

function parsePredictionScore(value, fieldName = 'score') {
  if (value === undefined || value === null || value === '') {
    return { ok: false, error: 'errors.predictionRequired' };
  }

  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (Number.isNaN(num) || !Number.isInteger(num)) {
    return { ok: false, error: 'errors.predictionScoreInvalid' };
  }
  if (num < 0 || num > MAX_SCORE) {
    return { ok: false, error: 'errors.predictionScoreOutOfRange', meta: { max: MAX_SCORE } };
  }

  return { ok: true, value: num };
}

function validatePredictionScores(predictedHomeScore, predictedAwayScore) {
  const home = parsePredictionScore(predictedHomeScore, 'home');
  if (!home.ok) return home;

  const away = parsePredictionScore(predictedAwayScore, 'away');
  if (!away.ok) return away;

  return {
    ok: true,
    predictedHomeScore: home.value,
    predictedAwayScore: away.value,
  };
}

module.exports = {
  MAX_SCORE,
  parsePredictionScore,
  validatePredictionScores,
};
