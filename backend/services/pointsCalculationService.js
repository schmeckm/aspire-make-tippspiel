function getTendency(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}

function calculatePoints(prediction, match, scoringRules) {
  if (match.homeScore === null || match.awayScore === null || match.status !== 'finished') {
    return null;
  }

  const { predictedHomeScore, predictedAwayScore } = prediction;
  const { homeScore, awayScore } = match;
  const rules = scoringRules || {
    exactResultPoints: 5,
    goalDifferencePoints: 3,
    tendencyPoints: 2,
    wrongPredictionPoints: 0,
  };

  if (predictedHomeScore === homeScore && predictedAwayScore === awayScore) {
    return rules.exactResultPoints;
  }

  const predictedDiff = predictedHomeScore - predictedAwayScore;
  const actualDiff = homeScore - awayScore;
  if (predictedDiff === actualDiff) {
    return rules.goalDifferencePoints;
  }

  const predictedTendency = getTendency(predictedHomeScore, predictedAwayScore);
  const actualTendency = getTendency(homeScore, awayScore);
  if (predictedTendency === actualTendency) {
    return rules.tendencyPoints;
  }

  return rules.wrongPredictionPoints;
}

function classifyPrediction(prediction, match, scoringRules) {
  const points = calculatePoints(prediction, match, scoringRules);
  if (points === null) return null;

  const rules = scoringRules || {
    exactResultPoints: 5,
    goalDifferencePoints: 3,
    tendencyPoints: 2,
    wrongPredictionPoints: 0,
  };

  if (points === rules.exactResultPoints) return 'exact';
  if (points === rules.goalDifferencePoints) return 'goalDifference';
  if (points === rules.tendencyPoints) return 'tendency';
  return 'wrong';
}

module.exports = {
  calculatePoints,
  classifyPrediction,
  getTendency,
};
