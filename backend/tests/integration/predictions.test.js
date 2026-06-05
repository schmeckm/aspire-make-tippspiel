const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, loginAs } = require('../helpers/testApp');
const { Match, Prediction, BonusQuestion, BonusPrediction } = require('../../models');

describe('Prediction locking and validation', { concurrency: 1 }, () => {
  let api;
  let userToken;
  let userId;
  let openMatchId;
  let lockedMatchId;
  let liveMatchId;
  let bonusQuestionId;
  let bonusPredictionId;

  before(async () => {
    api = await setupTestDb();
    const login = await loginAs(api, 'verified@example.com', 'user123');
    userToken = login.body.token;
    userId = login.body.user.id;

    const openMatch = await Match.create({
      matchNumber: 100,
      stage: 'Group Stage',
      groupName: 'B',
      homeTeam: 'Brasilien',
      awayTeam: 'Argentinien',
      kickoffTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'scheduled',
    });
    openMatchId = openMatch.id;

    const pastMatch = await Match.create({
      matchNumber: 101,
      stage: 'Group Stage',
      groupName: 'B',
      homeTeam: 'Spanien',
      awayTeam: 'Italien',
      kickoffTime: new Date(Date.now() - 60 * 60 * 1000),
      status: 'locked',
    });
    lockedMatchId = pastMatch.id;

    const liveMatch = await Match.create({
      matchNumber: 102,
      stage: 'Group Stage',
      groupName: 'C',
      homeTeam: 'England',
      awayTeam: 'USA',
      kickoffTime: new Date(Date.now() + 60 * 60 * 1000),
      status: 'live',
    });
    liveMatchId = liveMatch.id;

    const bonusQuestion = await BonusQuestion.create({
      questionText: 'Wer gewinnt Gruppe A?',
      status: 'open',
      lockTime: new Date(Date.now() - 60 * 60 * 1000),
      points: 5,
    });
    bonusQuestionId = bonusQuestion.id;

    const bonusPrediction = await BonusPrediction.create({
      userId,
      bonusQuestionId,
      answerJson: JSON.stringify('Deutschland'),
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });
    bonusPredictionId = bonusPrediction.id;
  });

  test('POST prediction on open match succeeds', async () => {
    const res = await api.post('/api/predictions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ matchId: openMatchId, predictedHomeScore: 2, predictedAwayScore: 1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.predictedHomeScore, 2);
  });

  test('POST duplicate prediction returns 409', async () => {
    const res = await api.post('/api/predictions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ matchId: openMatchId, predictedHomeScore: 1, predictedAwayScore: 0 });
    assert.equal(res.status, 409);
  });

  test('POST prediction after kickoff returns 403', async () => {
    const res = await api.post('/api/predictions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ matchId: lockedMatchId, predictedHomeScore: 1, predictedAwayScore: 1 });
    assert.equal(res.status, 403);
  });

  test('PUT prediction during live match returns 403', async () => {
    const created = await api.post('/api/predictions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ matchId: liveMatchId, predictedHomeScore: 1, predictedAwayScore: 0 });
    assert.equal(created.status, 403);
  });

  test('POST invalid score returns 400', async () => {
    const futureMatch = await Match.create({
      matchNumber: 103,
      stage: 'Group Stage',
      homeTeam: 'Japan',
      awayTeam: 'Korea',
      kickoffTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: 'scheduled',
    });
    const res = await api.post('/api/predictions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ matchId: futureMatch.id, predictedHomeScore: 'abc', predictedAwayScore: 1 });
    assert.equal(res.status, 400);
  });

  test('DELETE prediction after kickoff returns 403', async () => {
    const prediction = await Prediction.create({
      userId,
      matchId: lockedMatchId,
      predictedHomeScore: 1,
      predictedAwayScore: 0,
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    const res = await api.delete(`/api/predictions/${prediction.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 403);
  });

  test('Admin can edit prediction on locked match', async () => {
    const adminLogin = await loginAs(api, 'admin@example.com', 'admin123');

    const adminLockedMatch = await Match.create({
      matchNumber: 104,
      stage: 'Group Stage',
      groupName: 'D',
      homeTeam: 'Portugal',
      awayTeam: 'Niederlande',
      kickoffTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'locked',
    });

    const prediction = await Prediction.create({
      userId,
      matchId: adminLockedMatch.id,
      predictedHomeScore: 1,
      predictedAwayScore: 1,
      submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    });
    const originalSubmittedAt = prediction.submittedAt.toISOString();

    const res = await api.put(`/api/predictions/${prediction.id}`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .send({ predictedHomeScore: 3, predictedAwayScore: 2 });

    assert.equal(res.status, 200);
    assert.equal(res.body.predictedHomeScore, 3);
    assert.equal(res.body.predictedAwayScore, 2);
    assert.equal(new Date(res.body.submittedAt).toISOString(), originalSubmittedAt);
  });

  test('GET matches marks live match as not predictable', async () => {
    const res = await api.get('/api/matches')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    const live = res.body.find((m) => m.id === liveMatchId);
    assert.equal(live.canPredict, false);
  });

  test('Bonus PUT after lockTime returns 403', async () => {
    const res = await api.put(`/api/bonus-questions/predictions/${bonusPredictionId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ answer: 'Frankreich' });
    assert.equal(res.status, 403);
  });

  test('Leaderboard omits email for regular users', async () => {
    const res = await api.get('/api/leaderboard')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.length > 0);
    assert.equal(res.body[0].email, undefined);
  });

  test('Localized prediction closed error in English', async () => {
    const { User } = require('../../models');
    await User.update({ language: 'en' }, { where: { id: userId } });

    const res = await api.post('/api/predictions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ matchId: lockedMatchId, predictedHomeScore: 0, predictedAwayScore: 0 });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /no longer accepted/i);

    await User.update({ language: 'de' }, { where: { id: userId } });
  });
});

describe('Settings access control', { concurrency: 1 }, () => {
  let api;
  let userToken;
  let adminTokenVal;

  before(async () => {
    api = await setupTestDb();
    const userLogin = await loginAs(api, 'verified@example.com', 'user123');
    userToken = userLogin.body.token;
    const adminLogin = await loginAs(api, 'admin@example.com', 'admin123');
    adminTokenVal = adminLogin.body.token;
  });

  test('Regular user gets public settings only', async () => {
    const res = await api.get('/api/settings')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.appTitle, 'WM 2026 Tippspiel');
    assert.equal(res.body.apiSyncEnabled, undefined);
  });

  test('Admin gets all settings', async () => {
    const res = await api.get('/api/settings')
      .set('Authorization', `Bearer ${adminTokenVal}`);
    assert.equal(res.status, 200);
    assert.notEqual(res.body.apiSyncEnabled, undefined);
  });

  test('Settings update rejects unknown keys', async () => {
    const res = await api.put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminTokenVal}`)
      .send({ appTitle: 'Test', evilKey: true });
    assert.equal(res.status, 200);
    assert.ok(res.body._rejectedKeys?.includes('evilKey'));
    assert.equal(res.body.evilKey, undefined);
  });

  test('Admin favorites overview returns aggregated profile picks', async () => {
    const { User } = require('../../models');
    await User.update({
      topScorerPlayerId: 99,
      topScorerPlayerName: 'Test Scorer',
      favoriteNationalTeamId: 10,
      favoriteNationalTeamName: 'Deutschland',
    }, { where: { email: 'verified@example.com' } });

    const denied = await api.get('/api/statistics/admin/favorites')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(denied.status, 403);

    const res = await api.get('/api/statistics/admin/favorites')
      .set('Authorization', `Bearer ${adminTokenVal}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.summary.totalUsers >= 1);
    assert.ok(res.body.topScorerPicks.some((pick) => pick.playerName === 'Test Scorer'));
    assert.ok(res.body.favoriteTeams.some((team) => team.teamName === 'Deutschland'));
  });
});
