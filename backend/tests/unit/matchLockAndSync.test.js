const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mapStatus } = require('../../services/providers/providerUtils');
const { canEditPrediction } = require('../../services/matchLockService');
const { buildResultUpdateData } = require('../../services/matchSyncUtils');

describe('providerUtils.mapStatus', () => {
  test('maps football-data statuses correctly', () => {
    assert.equal(mapStatus('SCHEDULED'), 'scheduled');
    assert.equal(mapStatus('IN_PLAY'), 'live');
    assert.equal(mapStatus('PAUSED'), 'halftime');
    assert.equal(mapStatus('FINISHED'), 'finished');
    assert.equal(mapStatus('SUSPENDED'), 'suspended');
    assert.equal(mapStatus('CANCELLED'), 'cancelled');
  });
});

describe('matchLockService', () => {
  test('blocks live and past kickoff matches', () => {
    assert.equal(canEditPrediction({ status: 'live', kickoffTime: new Date(Date.now() + 3600000), isManuallyLocked: false }), false);
    assert.equal(canEditPrediction({ status: 'scheduled', kickoffTime: new Date(Date.now() - 1000), isManuallyLocked: false }), false);
    assert.equal(canEditPrediction({ status: 'scheduled', kickoffTime: new Date(Date.now() + 3600000), isManuallyLocked: false }), true);
  });
});

describe('matchSyncUtils.buildResultUpdateData', () => {
  test('does not persist live scores as final', () => {
    const match = { status: 'scheduled', homeScore: null, awayScore: null };
    const fixture = { status: 'live', homeScore: 1, awayScore: 0, apiLastStatus: 'IN_PLAY' };
    const { updateData } = buildResultUpdateData(fixture, match);
    assert.equal(updateData.homeScore, undefined);
    assert.equal(updateData.status, 'live');
  });

  test('persists scores when finished', () => {
    const match = { status: 'live', homeScore: null, awayScore: null };
    const fixture = { status: 'finished', homeScore: 2, awayScore: 1, apiLastStatus: 'FINISHED' };
    const { updateData, changed } = buildResultUpdateData(fixture, match);
    assert.equal(changed, true);
    assert.equal(updateData.homeScore, 2);
    assert.equal(updateData.awayScore, 1);
    assert.equal(updateData.status, 'finished');
  });
});
