const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('../helpers/testApp');
const { Match, Prediction, User } = require('../../models');
const {
  safeDestroyMatch,
  countPredictionsForMatch,
  findManualMatchForFixture,
} = require('../../services/predictionProtectionService');

describe('predictionProtectionService', () => {
  let match;
  let user;

  before(async () => {
    await setupTestDb();
    user = await User.findOne();
    match = await Match.findOne();
    await Prediction.destroy({ where: { userId: user.id, matchId: match.id } });
  });

  it('blocks deleting matches that already have predictions', async () => {
    await Prediction.create({
      userId: user.id,
      matchId: match.id,
      predictedHomeScore: 2,
      predictedAwayScore: 1,
      submittedAt: new Date(),
    });

    const result = await safeDestroyMatch(match, { context: 'test' });
    assert.equal(result.skipped, true);
    assert.equal(result.destroyed, false);
    assert.ok(result.predictionCount >= 1);

    const stillThere = await Match.findByPk(match.id);
    assert.ok(stillThere);
  });

  it('links manual fixtures by team aliases instead of creating duplicates', async () => {
    const manual = await Match.create({
      matchNumber: 9991,
      stage: 'GROUP_STAGE',
      groupName: 'A',
      homeTeam: 'Brasilien',
      awayTeam: 'Japan',
      kickoffTime: new Date('2026-06-12T18:00:00.000Z'),
      status: 'scheduled',
    });

    const linked = await findManualMatchForFixture({
      homeTeam: 'Brazil',
      awayTeam: 'Japan',
    });

    assert.equal(linked?.id, manual.id);
    await manual.destroy();
  });

  it('counts predictions per match', async () => {
    const count = await countPredictionsForMatch(match.id);
    assert.ok(count >= 1);
  });
});
