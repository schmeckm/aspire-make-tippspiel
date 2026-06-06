const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { getAppVersion } = require('../../utils/appVersion');
const { setupTestDb, adminToken } = require('../helpers/testApp');

describe('GET /api/health', () => {
  let api;

  before(async () => {
    api = await setupTestDb();
  });

  it('returns ok status', async () => {
    const res = await api.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.version, getAppVersion());
  });
});

describe('GET /api/teams', () => {
  let api;

  before(async () => {
    api = await setupTestDb();
  });

  it('lists seeded teams', async () => {
    const res = await api.get('/api/teams');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 2);
    assert.ok(res.body.some((t) => t.name === 'IT'));
  });
});

describe('GET /api/settings', () => {
  let api;
  let token;

  before(async () => {
    api = await setupTestDb();
    token = await adminToken(api);
  });

  it('returns default settings', async () => {
    const res = await api
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.requireEmailVerification, true);
    assert.equal(res.body.requireTeamOnRegistration, true);
  });
});

describe('GET /api/matches', () => {
  let api;
  let token;

  before(async () => {
    api = await setupTestDb();
    token = await adminToken(api);
  });

  it('lists seeded matches', async () => {
    const res = await api
      .get('/api/matches')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 1);
  });
});
