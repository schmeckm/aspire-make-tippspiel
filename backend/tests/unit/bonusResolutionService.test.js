require('../helpers/testEnv');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../../models');
const { Match } = require('../../models');
const {
  classifyMatchStage,
  getPodiumFromMatches,
  getTeamProgress,
  isProgressAnswerCorrect,
} = require('../../services/bonusResolutionService');

describe('bonusResolutionService', { concurrency: 1 }, () => {
  before(async () => {
    await sequelize.sync({ force: true });
  });

  test('classifyMatchStage distinguishes final from quarter-final', () => {
    assert.equal(classifyMatchStage('Final'), 'final');
    assert.equal(classifyMatchStage('Quarter Final'), 'quarter_final');
    assert.equal(classifyMatchStage('Third place'), 'third_place');
    assert.equal(classifyMatchStage('LAST_32'), 'last_32');
    assert.equal(classifyMatchStage('Round of 16'), 'round_of_16');
  });

  test('getPodiumFromMatches reads final and third place winners', async () => {
    await Match.bulkCreate([
      {
        matchNumber: 1,
        stage: 'Semi-finals',
        homeTeam: 'Germany',
        awayTeam: 'France',
        kickoffTime: '2026-07-10T20:00:00.000Z',
        homeScore: 2,
        awayScore: 1,
        status: 'finished',
      },
      {
        matchNumber: 2,
        stage: 'Third place',
        homeTeam: 'Spain',
        awayTeam: 'France',
        kickoffTime: '2026-07-12T20:00:00.000Z',
        homeScore: 3,
        awayScore: 2,
        status: 'finished',
      },
      {
        matchNumber: 3,
        stage: 'Final',
        homeTeam: 'Germany',
        awayTeam: 'Brazil',
        kickoffTime: '2026-07-19T20:00:00.000Z',
        homeScore: 1,
        awayScore: 0,
        status: 'finished',
      },
    ]);

    const podium = await getPodiumFromMatches();
    assert.equal(podium.champion.name, 'Germany');
    assert.equal(podium.runnerUp.name, 'Brazil');
    assert.equal(podium.thirdPlace.name, 'Spain');
    assert.equal(podium.available.champion, true);
  });

  test('getTeamProgress returns highest reached stage', async () => {
    await Match.bulkCreate([
      {
        matchNumber: 21,
        stage: 'Semi-finals',
        homeTeam: 'France',
        awayTeam: 'Germany',
        kickoffTime: '2026-07-10T20:00:00.000Z',
        homeScore: 0,
        awayScore: 1,
        status: 'finished',
      },
    ]);

    const progress = await getTeamProgress('France');
    assert.equal(progress, 'semiFinal');
  });

  test('getTeamProgress maps LAST_32 elimination correctly', async () => {
    await Match.bulkCreate([
      {
        matchNumber: 11,
        stage: 'Group Stage',
        groupName: 'C',
        homeTeam: 'Japan',
        awayTeam: 'Mexico',
        kickoffTime: '2026-06-14T18:00:00.000Z',
        homeScore: 1,
        awayScore: 0,
        status: 'finished',
      },
      {
        matchNumber: 12,
        stage: 'LAST_32',
        homeTeam: 'Japan',
        awayTeam: 'Belgium',
        kickoffTime: '2026-07-03T18:00:00.000Z',
        homeScore: 0,
        awayScore: 2,
        status: 'finished',
      },
    ]);

    const progress = await getTeamProgress('Japan');
    assert.equal(progress, 'roundOf32');
  });

  test('isProgressAnswerCorrect normalizes answers', () => {
    assert.equal(isProgressAnswerCorrect('Halbfinale', 'semiFinal'), true);
    assert.equal(isProgressAnswerCorrect('quarterFinal', 'semiFinal'), false);
  });
});
