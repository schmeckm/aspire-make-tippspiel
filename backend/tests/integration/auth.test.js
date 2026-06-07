const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, teardownTestDb } = require('../helpers/testApp');

after(async () => {
  await teardownTestDb();
});

function getUserModel() {
  return require('../../models').User;
}

describe('Auth API – registration & verification', () => {
  let api;
  let teamId;

  before(async () => {
    api = await setupTestDb();
    const teamsRes = await api.get('/api/teams');
    teamId = teamsRes.body[0].id;
  });

  it('rejects registration without team', async () => {
    const res = await api.post('/api/auth/register').send({
      firstName: 'No',
      lastName: 'Team',
      email: 'noteam@example.com',
      password: 'test123',
      passwordConfirm: 'test123',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Team|team/i);
  });

  it('registers user and requires email verification', async () => {
    const res = await api.post('/api/auth/register').send({
      firstName: 'New',
      lastName: 'User',
      email: 'newuser@example.com',
      password: 'test123',
      passwordConfirm: 'test123',
      teamId,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.requiresVerification, true);
    assert.ok(!res.body.token);
    assert.match(res.body.message, /E-Mail/i);

    const user = await getUserModel().findOne({ where: { email: 'newuser@example.com' } });
    assert.equal(user.emailVerified, false);
    assert.ok(user.emailVerificationToken);
  });

  it('blocks login for unverified user', async () => {
    const res = await api.post('/api/auth/login').send({
      email: 'newuser@example.com',
      password: 'test123',
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /E-Mail/i);
  });

  it('verifies email and returns token', async () => {
    const user = await getUserModel().findOne({ where: { email: 'newuser@example.com' } });
    const res = await api.post('/api/auth/verify-email').send({
      token: user.emailVerificationToken,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.emailVerified, true);

    const loginRes = await api.post('/api/auth/login').send({
      email: 'newuser@example.com',
      password: 'test123',
    });
    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.token);
  });

  it('resends verification email for unverified user', async () => {
    await api.post('/api/auth/register').send({
      firstName: 'Pending',
      lastName: 'User',
      email: 'pending@example.com',
      password: 'test123',
      passwordConfirm: 'test123',
      teamId,
    });

    const res = await api.post('/api/auth/resend-verification').send({
      email: 'pending@example.com',
    });
    assert.equal(res.status, 200);
    assert.match(res.body.message, /E-Mail/i);
  });
});

describe('Auth API – password reset', () => {
  let api;

  before(async () => {
    api = await setupTestDb();
  });

  it('sends password reset (always 200 for privacy)', async () => {
    const res = await api.post('/api/auth/forgot-password').send({
      email: 'verified@example.com',
    });
    assert.equal(res.status, 200);
    assert.match(res.body.message, /Passwort|E-Mail/i);
  });

  it('resets password with valid token', async () => {
    await api.post('/api/auth/forgot-password').send({
      email: 'verified@example.com',
    });

    const user = await getUserModel().findOne({ where: { email: 'verified@example.com' } });
    assert.ok(user.passwordResetToken);

    const res = await api.post('/api/auth/reset-password').send({
      token: user.passwordResetToken,
      password: 'newpass123',
    });
    assert.equal(res.status, 200);

    const loginRes = await api.post('/api/auth/login').send({
      email: 'verified@example.com',
      password: 'newpass123',
    });
    assert.equal(loginRes.status, 200);
  });

  it('rejects invalid reset token', async () => {
    const res = await api.post('/api/auth/reset-password').send({
      token: 'invalid-token',
      password: 'test123',
    });
    assert.equal(res.status, 400);
  });
});

describe('Auth API – admin login', () => {
  let api;

  before(async () => {
    api = await setupTestDb();
  });

  it('admin can login without verification block', async () => {
    const res = await api.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'admin123',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'admin');
  });
});
