const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  templateEmailVerification,
  templatePasswordReset,
} = require('../../services/authEmailService');

describe('authEmailService templates', () => {
  const user = { firstName: 'Max', email: 'max@example.com', language: 'de' };

  it('verification template contains verify link with token', () => {
    const token = 'abc123';
    const tpl = templateEmailVerification(user, token);
    assert.match(tpl.subject, /bestätigen/i);
    assert.match(tpl.html, /verify-email\?token=abc123/);
    assert.match(tpl.text, /abc123/);
  });

  it('verification template uses branded layout', () => {
    const tpl = templateEmailVerification(user, 'abc123');
    assert.match(tpl.html, /Aspire MAKE/);
    assert.match(tpl.html, /#e86a33/);
  });

  it('verification template uses requested locale', () => {
    const token = 'abc123';
    const tpl = templateEmailVerification(user, token, 'en');
    assert.match(tpl.subject, /Verify email/i);
    assert.match(tpl.html, /Welcome, Max!/);
  });

  it('password reset template contains reset link with token', () => {
    const token = 'reset456';
    const tpl = templatePasswordReset(user, token);
    assert.match(tpl.subject, /Passwort/i);
    assert.match(tpl.html, /reset-password\?token=reset456/);
    assert.match(tpl.text, /reset456/);
  });

  it('password reset template uses requested locale', () => {
    const token = 'reset456';
    const tpl = templatePasswordReset(user, token, 'en');
    assert.match(tpl.subject, /Reset password/i);
    assert.match(tpl.html, /Hello Max!/);
    assert.match(tpl.html, /You requested a password reset/);
    assert.match(tpl.html, /Set new password/);
  });
});
