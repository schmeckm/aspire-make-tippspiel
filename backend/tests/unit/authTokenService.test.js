const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateToken, expiresInHours, getAppUrl } = require('../../services/authTokenService');

describe('authTokenService', () => {
  it('generateToken returns 64-char hex string', () => {
    const token = generateToken();
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.notEqual(token, generateToken());
  });

  it('expiresInHours returns future date', () => {
    const expiry = expiresInHours(24);
    assert.ok(expiry instanceof Date);
    assert.ok(expiry.getTime() > Date.now());
    assert.ok(expiry.getTime() < Date.now() + 25 * 60 * 60 * 1000);
  });

  it('getAppUrl uses APP_URL env', () => {
    const original = process.env.APP_URL;
    process.env.APP_URL = 'http://test.example.com';
    assert.equal(getAppUrl(), 'http://test.example.com');
    process.env.APP_URL = original;
  });
});
