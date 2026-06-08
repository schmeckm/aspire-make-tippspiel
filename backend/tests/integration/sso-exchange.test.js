const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, teardownTestDb, loginAs } = require('../helpers/testApp');
const {
  createExchangeCode,
  cacheExchangeResult,
  getCachedExchangeResult,
  resetOAuthStateForTests,
} = require('../../services/oauthService');
const temporaryStore = require('../../services/temporaryStore');

after(async () => {
  await teardownTestDb();
});

describe('SSO exchange', () => {
  let api;
  let adminUser;

  before(async () => {
    api = await setupTestDb();
    const loginRes = await loginAs(api, 'admin@example.com', 'admin123');
    adminUser = loginRes.body.user;
  });

  beforeEach(() => {
    resetOAuthStateForTests();
    temporaryStore.resetForTests();
  });

  it('exchanges a valid code and returns auth tokens', async () => {
    const code = await createExchangeCode({ user: adminUser });

    const res = await api.post('/api/auth/exchange').send({ code });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.ok(res.body.refreshToken);
    assert.equal(res.body.user.id, adminUser.id);
  });

  it('rejects missing codes', async () => {
    const res = await api.post('/api/auth/exchange').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'errors.ssoInvalidCode');
  });

  it('rejects unknown codes after cache expires', async () => {
    const res = await api.post('/api/auth/exchange').send({ code: 'deadbeef'.repeat(8) });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'errors.ssoInvalidCode');
  });

  it('returns cached auth for duplicate exchange within TTL', async () => {
    const code = await createExchangeCode({ user: adminUser });

    const first = await api.post('/api/auth/exchange').send({ code });
    const second = await api.post('/api/auth/exchange').send({ code });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.token, first.body.token);
    assert.equal(second.body.refreshToken, first.body.refreshToken);
  });

  it('returns team-required error with machine-readable code', async () => {
    const code = await createExchangeCode({
      requiresTeam: true,
      pending: {
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'User',
        provider: 'google',
      },
    });

    const res = await api.post('/api/auth/exchange').send({ code });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'errors.ssoTeamRequired');
  });

  it('stores exchange results in temporary cache', async () => {
    const payload = { token: 't', refreshToken: 'r', user: { id: 1 } };
    await cacheExchangeResult('abc', payload);
    assert.deepEqual(await getCachedExchangeResult('abc'), payload);
  });
});
