const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculatePoints, classifyPrediction, getTendency } = require('../../services/pointsCalculationService');

const rules = {
  exactResultPoints: 5,
  goalDifferencePoints: 3,
  tendencyPoints: 2,
  wrongPredictionPoints: 0,
};

describe('pointsCalculationService', () => {
  test('exact score awards exact points', () => {
    const prediction = { predictedHomeScore: 2, predictedAwayScore: 1 };
    const match = { homeScore: 2, awayScore: 1, status: 'finished' };
    assert.equal(calculatePoints(prediction, match, rules), 5);
    assert.equal(classifyPrediction(prediction, match, rules), 'exact');
  });

  test('goal difference awards goal diff points', () => {
    const prediction = { predictedHomeScore: 3, predictedAwayScore: 1 };
    const match = { homeScore: 2, awayScore: 0, status: 'finished' };
    assert.equal(calculatePoints(prediction, match, rules), 3);
  });

  test('tendency awards tendency points', () => {
    const prediction = { predictedHomeScore: 3, predictedAwayScore: 0 };
    const match = { homeScore: 1, awayScore: 0, status: 'finished' };
    assert.equal(calculatePoints(prediction, match, rules), 2);
  });

  test('draw tendency is detected correctly', () => {
    assert.equal(getTendency(0, 0), 'draw');
    assert.equal(getTendency(1, 1), 'draw');
    assert.equal(getTendency(2, 2), 'draw');
  });

  test('wrong prediction awards zero', () => {
    const prediction = { predictedHomeScore: 2, predictedAwayScore: 0 };
    const match = { homeScore: 0, awayScore: 2, status: 'finished' };
    assert.equal(calculatePoints(prediction, match, rules), 0);
  });

  test('returns null until match finished', () => {
    const prediction = { predictedHomeScore: 1, predictedAwayScore: 1 };
    const match = { homeScore: null, awayScore: null, status: 'scheduled' };
    assert.equal(calculatePoints(prediction, match, rules), null);
  });
});
