const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, loginAs } = require('../helpers/testApp');
const { resetBlacklistForTests } = require('../../services/tokenBlacklistService');
const { setSetting } = require('../../services/settingsService');

describe('Auth API – logout & token blacklist', () => {
  let api;

  before(async () => {
    resetBlacklistForTests();
    api = await setupTestDb();
  });

  it('logout blacklists token and rejects subsequent requests', async () => {
    const loginRes = await loginAs(api, 'verified@example.com', 'user123');
    assert.equal(loginRes.status, 200);
    const token = loginRes.body.token;

    const logoutRes = await api.post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    assert.equal(logoutRes.status, 200);

    const meRes = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(meRes.status, 401);
    assert.match(meRes.body.error, /Sitzung|session|expired|abgelaufen/i);
  });
});

describe('Display API', () => {
  let api;

  before(async () => {
    api = await setupTestDb();
    await setSetting('displayModeEnabled', true);
  });

  it('returns public leaderboard without auth', async () => {
    const res = await api.get('/api/display/leaderboard');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.entries));
    assert.ok(res.body.updatedAt);
  });

  it('blocks display when disabled', async () => {
    await setSetting('displayModeEnabled', false);
    const res = await api.get('/api/display/leaderboard');
    assert.equal(res.status, 403);
    await setSetting('displayModeEnabled', true);
  });
});

describe('Leaderboard – admin inclusion setting', () => {
  let api;
  let userToken;
  let adminToken;

  before(async () => {
    api = await setupTestDb();
    const userLogin = await loginAs(api, 'verified@example.com', 'user123');
    userToken = userLogin.body.token;
    const adminLogin = await loginAs(api, 'admin@example.com', 'admin123');
    adminToken = adminLogin.body.token;
    await setSetting('includeAdminsInLeaderboard', false);
  });

  it('excludes admins by default', async () => {
    const res = await api.get('/api/leaderboard').set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    const hasAdmin = res.body.some((e) => e.firstName === 'Admin');
    assert.equal(hasAdmin, false);
  });

  it('includes admins when setting enabled', async () => {
    await setSetting('includeAdminsInLeaderboard', true);
    const res = await api.get('/api/leaderboard').set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    const hasAdmin = res.body.some((e) => e.firstName === 'Admin');
    assert.equal(hasAdmin, true);
    await setSetting('includeAdminsInLeaderboard', false);
  });
});
