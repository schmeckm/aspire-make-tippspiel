const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const speakeasy = require('speakeasy');
const { setupTestDb, teardownTestDb, adminToken } = require('../helpers/testApp');

after(async () => {
  await teardownTestDb();
});

describe('Auth API – refresh tokens', () => {
  let api;

  before(async () => {
    api = await setupTestDb();
  });

  it('returns refresh token on login and rotates on refresh', async () => {
    const loginRes = await api.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'admin123',
    });
    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.token);
    assert.ok(loginRes.body.refreshToken);

    const refreshRes = await api.post('/api/auth/refresh').send({
      refreshToken: loginRes.body.refreshToken,
    });
    assert.equal(refreshRes.status, 200);
    assert.ok(refreshRes.body.token);
    assert.ok(refreshRes.body.refreshToken);
    assert.notEqual(refreshRes.body.refreshToken, loginRes.body.refreshToken);

    const oldRefreshRes = await api.post('/api/auth/refresh').send({
      refreshToken: loginRes.body.refreshToken,
    });
    assert.equal(oldRefreshRes.status, 401);
  });

  it('revokes refresh token on logout', async () => {
    const loginRes = await api.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'admin123',
    });
    assert.equal(loginRes.status, 200);

    const logoutRes = await api.post('/api/auth/logout')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ refreshToken: loginRes.body.refreshToken });
    assert.equal(logoutRes.status, 200);

    const refreshRes = await api.post('/api/auth/refresh').send({
      refreshToken: loginRes.body.refreshToken,
    });
    assert.equal(refreshRes.status, 401);
  });
});

describe('Auth API – two-factor authentication', () => {
  let api;
  let token;

  before(async () => {
    api = await setupTestDb();
    token = await adminToken(api);
  });

  it('sets up, enables, and requires TOTP on login', async () => {
    const setupRes = await api.post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(setupRes.status, 200);
    assert.ok(setupRes.body.secret);
    assert.ok(setupRes.body.otpauthUrl);

    const totpCode = speakeasy.totp({
      secret: setupRes.body.secret,
      encoding: 'base32',
    });

    const enableRes = await api.post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: totpCode });
    assert.equal(enableRes.status, 200);

    const missingTotpRes = await api.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'admin123',
    });
    assert.equal(missingTotpRes.status, 403);
    assert.equal(missingTotpRes.body.requiresTotp, true);

    const loginRes = await api.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'admin123',
      totpCode: speakeasy.totp({
        secret: setupRes.body.secret,
        encoding: 'base32',
      }),
    });
    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.token);
    assert.ok(loginRes.body.refreshToken);
  });

  it('disables two-factor with a valid code', async () => {
    const setupRes = await api.post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    const secret = setupRes.body.secret;
    const enableCode = speakeasy.totp({ secret, encoding: 'base32' });

    await api.post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: enableCode });

    const disableRes = await api.post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: speakeasy.totp({ secret, encoding: 'base32' }) });
    assert.equal(disableRes.status, 200);

    const loginRes = await api.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'admin123',
    });
    assert.equal(loginRes.status, 200);
    assert.ok(!loginRes.body.requiresTotp);
  });
});
