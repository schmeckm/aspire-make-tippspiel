require('../helpers/testEnv');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const {
  sequelize,
  User,
  Match,
  BonusQuestion,
  BonusPrediction,
} = require('../../models');
const { bonusAnswersMatch, recalculateBonusPoints } = require('../../services/leaderboardService');
const {
  getPodiumFromMatches,
  getTeamProgress,
  inferResolutionKey,
  isProgressAnswerCorrect,
} = require('../../services/bonusResolutionService');

describe('bonus scoring logic', { concurrency: 1 }, () => {
  before(async () => {
    await sequelize.sync({ force: true });
  });

  test('bonusAnswersMatch accepts German and English team names', () => {
    const answer = { id: 1, name: 'Germany' };
    const correct = { id: null, name: 'Deutschland' };
    assert.equal(bonusAnswersMatch(answer, correct, 'national_team'), true);
    assert.equal(bonusAnswersMatch({ id: 99, name: 'Brasilien' }, { id: 2, name: 'Brazil' }, 'national_team'), true);
  });

  test('inferResolutionKey falls back to question text', () => {
    assert.equal(inferResolutionKey({ questionText: 'Wer wird Vize-Weltmeister?', questionType: 'national_team' }), 'runner_up');
    assert.equal(inferResolutionKey({ questionText: 'Wer wird Torschützenkönig?', questionType: 'national_team_player' }), 'top_scorer');
  });

  test('champion bonus awards points after tournament resolve', async () => {
    await Match.create({
      matchNumber: 10,
      stage: 'Final',
      homeTeam: 'Argentinien',
      awayTeam: 'Brasilien',
      kickoffTime: '2026-07-19T20:00:00.000Z',
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    });

    const user = await User.create({
      firstName: 'Max',
      lastName: 'Test',
      email: 'bonus@test.local',
      password: 'test12345',
      role: 'user',
      emailVerified: true,
    });

    const question = await BonusQuestion.create({
      questionText: 'Wer wird Weltmeister?',
      questionType: 'national_team',
      points: 8,
      status: 'resolved',
      resolutionKey: 'champion',
      correctAnswerJson: JSON.stringify({ id: null, name: 'Argentinien' }),
    });

    await BonusPrediction.create({
      userId: user.id,
      bonusQuestionId: question.id,
      answerJson: JSON.stringify({ id: 1, name: 'Argentina' }),
      submittedAt: new Date(),
    });

    const updated = await recalculateBonusPoints();
    const prediction = await BonusPrediction.findOne({ where: { userId: user.id } });
    assert.equal(updated, 1);
    assert.equal(prediction.points, 8);
  });

  test('favorite team progress scores per user favorite team', async () => {
    await Match.bulkCreate([
      {
        matchNumber: 20,
        stage: 'Group Stage',
        groupName: 'A',
        homeTeam: 'Deutschland',
        awayTeam: 'Japan',
        kickoffTime: '2026-06-12T18:00:00.000Z',
        homeScore: 2,
        awayScore: 0,
        status: 'finished',
      },
      {
        matchNumber: 21,
        stage: 'LAST_32',
        homeTeam: 'Deutschland',
        awayTeam: 'Portugal',
        kickoffTime: '2026-07-02T18:00:00.000Z',
        homeScore: 1,
        awayScore: 0,
        status: 'finished',
      },
      {
        matchNumber: 22,
        stage: 'Round of 16',
        homeTeam: 'Deutschland',
        awayTeam: 'England',
        kickoffTime: '2026-07-06T18:00:00.000Z',
        homeScore: 0,
        awayScore: 1,
        status: 'finished',
      },
    ]);

    const progress = await getTeamProgress('Germany');
    assert.equal(progress, 'roundOf16');

    const winner = await User.create({
      firstName: 'Anna',
      lastName: 'Tippt',
      email: 'winner@test.local',
      password: 'test12345',
      role: 'user',
      emailVerified: true,
      favoriteNationalTeamName: 'Deutschland',
    });
    const loser = await User.create({
      firstName: 'Ben',
      lastName: 'Tippt',
      email: 'loser@test.local',
      password: 'test12345',
      role: 'user',
      emailVerified: true,
      favoriteNationalTeamName: 'Deutschland',
    });

    const question = await BonusQuestion.create({
      questionText: 'Wie weit kommt {team}?',
      questionType: 'favorite_team_progress',
      points: 2,
      status: 'resolved',
      resolutionKey: 'team_progress',
    });

    await BonusPrediction.bulkCreate([
      {
        userId: winner.id,
        bonusQuestionId: question.id,
        answerJson: JSON.stringify('roundOf16'),
        submittedAt: new Date(),
      },
      {
        userId: loser.id,
        bonusQuestionId: question.id,
        answerJson: JSON.stringify('quarterFinal'),
        submittedAt: new Date(),
      },
    ]);

    await recalculateBonusPoints();
    const winnerPrediction = await BonusPrediction.findOne({ where: { userId: winner.id } });
    const loserPrediction = await BonusPrediction.findOne({ where: { userId: loser.id } });
    assert.equal(winnerPrediction.points, 2);
    assert.equal(loserPrediction.points, 0);
    assert.equal(isProgressAnswerCorrect('Achtelfinale', 'roundOf16'), true);
  });

  test('getPodiumFromMatches uses latest finished final', async () => {
    await Match.create({
      matchNumber: 30,
      stage: 'Final',
      homeTeam: 'Spanien',
      awayTeam: 'Frankreich',
      kickoffTime: '2026-07-20T20:00:00.000Z',
      homeScore: 3,
      awayScore: 1,
      status: 'finished',
    });

    const podium = await getPodiumFromMatches();
    assert.equal(podium.champion.name, 'Spanien');
    assert.equal(podium.runnerUp.name, 'Frankreich');
  });
});
