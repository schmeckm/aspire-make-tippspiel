const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, adminToken } = require('../helpers/testApp');

describe('Email API (admin)', () => {
  let api;
  let token;

  before(async () => {
    api = await setupTestDb();
    token = await adminToken(api);
  });

  it('returns SMTP status checklist', async () => {
    const res = await api
      .get('/api/admin/email/status')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.configured, false);
    assert.ok(Array.isArray(res.body.checklist));
    assert.equal(res.body.checklistComplete, false);
    assert.equal(res.body.requireEmailVerification, true);
  });

  it('sends test email in mock mode', async () => {
    const res = await api
      .post('/api/admin/email/send-test')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    assert.equal(res.status, 200);
    assert.match(res.body.message, /Test/i);
    assert.equal(res.body.result.mock, true);
  });

  it('rejects unauthenticated access', async () => {
    const res = await api.get('/api/admin/email/status');
    assert.equal(res.status, 401);
  });
});

describe('Users API (admin)', () => {
  let api;
  let token;
  let teamId;

  before(async () => {
    api = await setupTestDb();
    token = await adminToken(api);
    const teamsRes = await api.get('/api/teams');
    teamId = teamsRes.body[0].id;
  });

  it('lists users', async () => {
    const res = await api
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.some((u) => u.email === 'admin@example.com'));
  });

  it('creates user with verified email', async () => {
    const res = await api
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Created',
        lastName: 'ByAdmin',
        email: 'admin-created@example.com',
        password: 'user123',
        role: 'user',
        teamId,
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.emailVerified, true);
  });

  it('promotes user to admin', async () => {
    const listRes = await api
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    const user = listRes.body.find((u) => u.email === 'admin-created@example.com');

    const res = await api
      .put(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'admin');
  });
});

describe('Leaderboard API', () => {
  let api;
  let token;

  before(async () => {
    api = await setupTestDb();
    token = await adminToken(api);
  });

  it('returns leaderboard array', async () => {
    const res = await api
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('returns team ranking', async () => {
    const res = await api
      .get('/api/leaderboard/team-ranking')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});
